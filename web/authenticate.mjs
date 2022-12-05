import {
  browserSupportsWebAuthn,
  startAuthentication,
} from './node_modules/@simplewebauthn/browser/dist/bundle/index.js';

import { config } from './config.js';

class AuthenticationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'AuthenticationError';
    this.details = details;
  }
}

export const authenticate = async ({
  email,
  emailLoginLinkOnFailure = false,
  useBrowserAutofill,
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
      body: JSON.stringify({ email, credential: asseRes }),
      credentials: 'include',
    });

    const verificationJSON = await verificationRes.json();
    if (!verificationRes.ok) {
      throw new AuthenticationError(
        `Failed: ${verificationRes.statusText} ${JSON.stringify(verificationJSON, null, 2)}`,
        asseRes
      );
    }

    if (verificationJSON?.clientExtensionResults?.credProps?.rk) {
      localStorage.setItem('hasResidentKey', true);
    } else {
      localStorage.removeItem('hasResidentKey');
    }

    if (verificationJSON && verificationJSON.verified) {
      return 'verified';
    } else {
      throw new AuthenticationError(
        `Verification error: ${JSON.stringify(verificationJSON, null, 2)}`
      );
    }
  } catch (err) {
    localStorage.removeItem('hasResidentKey');
    const userId = err.details?.response?.userHandle;
    if (err.message?.includes('Failed')) {
      return err.message?.includes('User not found')
        ? `No account was found matching this ${email ? 'email address' : 'passkey'}.`
        : 'There was an error while trying to login.';
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
      return sendValidationReq.ok
        ? "Check your email/console, we've sent you a login link."
        : 'There was an error while trying to send you a validation email';
    }
    throw err;
  }
};
