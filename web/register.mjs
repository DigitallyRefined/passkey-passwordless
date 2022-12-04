import { startRegistration } from './node_modules/@simplewebauthn/browser/dist/bundle/index.js';

import { config } from './config.js';
const { authenticatorAttachment, residentKey } = config.webAuthnOptions;

export const register = async ({
  email,
  isExistingUser = false,
  askForDeviceName = false,
} = {}) => {
  const credentials = isExistingUser ? 'include' : 'same-origin';

  try {
    const generateOptionsUrl = isExistingUser
      ? `${config.apiUrl}/account/add-device/generate-options`
      : `${config.apiUrl}/registration/generate-options`;
    const res = await fetch(generateOptionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      ...(email && { body: JSON.stringify({ email }) }),
      credentials,
    });

    const opts = await res.json();
    if (!res.ok) {
      throw new Error(`Failed: ${res.statusText} ${JSON.stringify(opts, null, 2)}`);
    }

    opts.authenticatorSelection.authenticatorSelection = authenticatorAttachment;
    opts.authenticatorSelection.residentKey = residentKey;
    opts.authenticatorSelection.requireResidentKey = residentKey === 'required';
    opts.extensions = {
      credProps: Boolean(residentKey === 'preferred' || residentKey === 'required'),
    };

    console.log('Registration Options', JSON.stringify(opts, null, 2));

    const attRes = await startRegistration(opts);
    console.log('Registration Response', JSON.stringify(attRes, null, 2));
    if (attRes?.clientExtensionResults?.credProps?.rk) {
      localStorage.setItem('hasResidentKey', true);
    } else {
      localStorage.removeItem('hasResidentKey');
    }

    const deviceName = askForDeviceName ? prompt('Device name') : undefined;

    const verificationUrl = isExistingUser
      ? `${config.apiUrl}/account/add-device/verify`
      : `${config.apiUrl}/registration/verify`;
    const verificationRes = await fetch(verificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, credential: attRes, deviceName }),
      credentials,
    });

    const verificationJSON = await verificationRes.json();
    if (!verificationRes.ok) {
      throw new Error(
        `Failed: ${verificationRes.statusText} ${JSON.stringify(verificationJSON, null, 2)}`
      );
    }

    if (verificationJSON && verificationJSON.verified) {
      return 'registered';
    } else {
      throw new Error(`Verification error: ${JSON.stringify(verificationJSON, null, 2)}`);
    }
  } catch (err) {
    localStorage.removeItem('hasResidentKey');
    if (err.message.includes('Failed')) {
      return err.message.includes('Email already registered')
        ? 'This email address is already registered.'
        : 'There was an error while trying to create your account.';
    }
    if (askForDeviceName) {
      throw err;
    } else {
      console.error(err);
    }
  }

  return 'ok';
};
