import { startRegistration } from './simpleWebAuthnBrowserProxy.mjs';

import { config } from '../config.mjs';
const { authenticatorAttachment, residentKey } = config.webAuthnOptions;

export const register = async ({
  email,
  isExistingUser = false,
  askForCredentialName = false,
}: {
  email?: string;
  isExistingUser?: boolean;
  askForCredentialName?: boolean;
} = {}) => {
  const credentials = isExistingUser ? 'include' : 'same-origin';

  try {
    const generateOptionsUrl = isExistingUser
      ? `${config.apiUrl}/account/add-credential/generate-options`
      : `${config.apiUrl}/registration/generate-options`;
    const res = await fetch(generateOptionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      ...(email && { body: JSON.stringify({ email }) }),
      credentials,
    });

    const options = await res.json();
    if (!res.ok) {
      throw new Error(`Failed: ${res.statusText} ${JSON.stringify(options, null, 2)}`);
    }

    options.authenticatorSelection.authenticatorSelection = authenticatorAttachment;
    options.authenticatorSelection.residentKey = residentKey;
    options.authenticatorSelection.requireResidentKey = residentKey === 'required';
    options.extensions = {
      credProps: Boolean(residentKey === 'preferred' || residentKey === 'required'),
    };

    console.log('Registration Options', JSON.stringify(options, null, 2));

    const attRes = await startRegistration({ optionsJSON: options });
    console.log('Registration Response', JSON.stringify(attRes, null, 2));
    if (
      attRes?.authenticatorAttachment === 'platform' ||
      attRes?.clientExtensionResults?.credProps?.rk
    ) {
      localStorage.setItem('canLoginWithResidentKey', 'true');
    } else {
      localStorage.removeItem('canLoginWithResidentKey');
    }

    const credentialName = askForCredentialName ? prompt('Passkey name') : undefined;

    const verificationUrl = isExistingUser
      ? `${config.apiUrl}/account/add-credential/verify`
      : `${config.apiUrl}/registration/verify`;
    const verificationRes = await fetch(verificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, registrationBody: attRes, credentialName }),
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
    localStorage.removeItem('canLoginWithResidentKey');

    if (!(err instanceof Error)) {
      throw err;
    }

    if (err.message.includes('Failed')) {
      return err.message.includes('Email already registered')
        ? 'This email address is already registered.'
        : 'There was an error while trying to create your account.';
    }
    if (askForCredentialName) {
      throw err;
    } else {
      console.error(err);
    }
  }

  return 'ok';
};
