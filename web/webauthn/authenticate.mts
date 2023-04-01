import {
  browserSupportsWebAuthn,
  startAuthentication,
  // @ts-ignore
} from '../node_modules/@simplewebauthn/browser/dist/bundle/index.js';
// @ts-ignore
import type { AuthenticationResponseJSON } from '@simplewebauthn/typescript-types';

import { config } from '../config.mjs';

class AuthenticationError extends Error {
  details?: AuthenticationResponseJSON;

  constructor(message?: string, details?: AuthenticationResponseJSON) {
    super(message);
    this.name = 'AuthenticationError';
    this.details = details;
  }
}

export const authenticate = async ({
  email,
  emailLoginLinkOnFailure = false,
  useBrowserAutofill,
}: {
  email?: string;
  emailLoginLinkOnFailure?: boolean;
  useBrowserAutofill?: boolean;
} = {}) => {
  try {
    if (!browserSupportsWebAuthn()) {
      throw new AuthenticationError('Browser not supported falling back to email login');
    }

    const res = await fetch(`${config.apiUrl}/authentication/generate-options`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      ...(email && { body: JSON.stringify({ email }) }),
    });

    const opts = await res.json();
    console.log('Authentication Options', JSON.stringify(opts, null, 2));

    if (!res.ok) {
      throw new AuthenticationError(`Failed: ${res.statusText} ${JSON.stringify(opts, null, 2)}`);
    }

    const asseRes = await startAuthentication(opts, useBrowserAutofill);
    console.log('Authentication Response', JSON.stringify(asseRes, null, 2));

    const verificationRes = await fetch(`${config.apiUrl}/authentication/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, authenticationBody: asseRes }),
      credentials: 'include',
    });

    const verificationJSON = await verificationRes.json();
    if (!verificationRes.ok) {
      throw new AuthenticationError(
        `Failed: ${verificationRes.statusText} ${JSON.stringify(verificationJSON, null, 2)}`,
        asseRes
      );
    }

    if (
      asseRes.authenticatorAttachment === 'platform' ||
      verificationJSON?.clientExtensionResults?.credProps?.rk
    ) {
      localStorage.setItem('canLoginWithResidentKey', 'true');
    } else {
      localStorage.removeItem('canLoginWithResidentKey');
    }

    if (verificationJSON && verificationJSON.verified) {
      return { ...verificationJSON, error: false };
    } else {
      throw new AuthenticationError(
        `Verification error: ${JSON.stringify(verificationJSON, null, 2)}`
      );
    }
  } catch (err) {
    localStorage.removeItem('canLoginWithResidentKey');

    if (!(err instanceof AuthenticationError)) {
      throw err;
    }

    const userId = err.details?.response?.userHandle;
    if (err.message?.includes('User not found')) {
      return {
        error: `No account was found matching this ${email ? 'email address' : 'passkey'}.`,
      };
    } else if (emailLoginLinkOnFailure && (email || userId)) {
      console.error(err);

      const sendValidationReq = await fetch(`${config.apiUrl}/email/send/validation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(email ? { email } : { id: userId }),
      });
      console.log('Send email validation response', await sendValidationReq.text());
      return {
        error: sendValidationReq.ok
          ? "Check your email/console, we've sent you a login link."
          : 'There was an error while trying to send you a validation email',
      };
    }
    throw err;
  }
};
