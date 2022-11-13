import { startAuthentication } from './node_modules/@simplewebauthn/browser/dist/bundle/index.js';

import { config } from './config.js';

export const authenticate = async ({ email, rememberMe, emailLoginLinkOnFailure = false } = {}) => {
  try {
    if (rememberMe !== undefined) {
      if (rememberMe) {
        localStorage.setItem('email', email);
      } else {
        localStorage.removeItem('email');
      }
    }

    const res = await fetch(`${config.apiUrl}/authentication/generate-options`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      ...(email && { body: JSON.stringify({ email }) }),
    });

    let asseRes;
    const opts = await res.json();
    console.log('Authentication Options', JSON.stringify(opts, null, 2));

    if (!res.ok) {
      throw new Error(`Failed: ${res.statusText} ${JSON.stringify(opts, null, 2)}`);
    }

    asseRes = await startAuthentication(opts);
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
      throw new Error(`Failed: ${verificationRes.statusText} ${JSON.stringify(verificationJSON, null, 2)}`);
    }

    if (verificationJSON?.clientExtensionResults?.credProps?.rk) {
      localStorage.setItem('hasResidentKey', true);
    } else {
      localStorage.removeItem('hasResidentKey');
    }

    if (verificationJSON && verificationJSON.verified) {
      return 'verified';
    } else {
      throw new Error(`Verification error: ${JSON.stringify(verificationJSON, null, 2)}`);
    }
  } catch (err) {
    if (
      email &&
      emailLoginLinkOnFailure &&
      (err.name === 'NotAllowedError' ||
        err.message?.includes('Authenticator not found') ||
        err.message?.includes('Account not verified') ||
        err.message?.includes('not supported') ||
        err.includes?.('Cancelling'))
    ) {
      console.error(err);

      const sendValidationReq = await fetch(`${config.apiUrl}/email/send/validation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      return sendValidationReq.ok
        ? "Check your email/console, we've sent you a login link."
        : 'There was an error while trying to send you a validation email';
    } else if (err.message?.includes('Failed')) {
      return err.message?.includes('User not found')
        ? 'Account not found or email address has not been verified.'
        : 'There was an error while trying to login.';
    }
    throw err;
  }
};
