import { browserSupportsWebAuthn, startAuthentication } from './simpleWebAuthnBrowserProxy.mjs';

import type { AuthenticationResponseJSON } from '@simplewebauthn/server';

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
  passphraseAttempt,
}: {
  email?: string;
  emailLoginLinkOnFailure?: boolean;
  useBrowserAutofill?: boolean;
  passphraseAttempt?: string;
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

    const options = await res.json();
    console.log('Authentication Options', JSON.stringify(options, null, 2));

    if (!res.ok) {
      throw new AuthenticationError(
        `Failed: ${res.statusText} ${JSON.stringify(options, null, 2)}`
      );
    }

    const asseRes = await startAuthentication({ optionsJSON: options, useBrowserAutofill });
    console.log('Authentication Response', JSON.stringify(asseRes, null, 2));

    const verificationRes = await fetch(`${config.apiUrl}/authentication/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, authenticationBody: asseRes, passphraseAttempt }),
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
      verificationJSON?.requiresPassphrase !== true &&
      (asseRes.authenticatorAttachment === 'platform' ||
        verificationJSON?.clientExtensionResults?.credProps?.rk)
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

    const isAuthenticationError = err instanceof AuthenticationError;
    const userId = isAuthenticationError ? err.details?.response?.userHandle : null;
    if (isAuthenticationError && err.message?.includes('User not found')) {
      return {
        error: `No account was found matching this ${
          email ? 'email address' : 'passkey'
        }, please login via email.`,
      };
    } else if (isAuthenticationError && err.message?.includes('Invalid passphrase')) {
      return { error: `Invalid passphrase.` };
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
          : 'There was an error validating your passkey, please login via email.',
        hideLogin: sendValidationReq.ok,
      };
    }
    throw err;
  }
};
