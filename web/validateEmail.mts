import { register } from './webauthn/register.mjs';

import { config } from './config.mjs';

const feedbackTxt = document.querySelector('#feedbackTxt') as HTMLParagraphElement;

const params = new URLSearchParams(window.location.search);

const registerDevice = async () => {
  (document.querySelector('.alert') as HTMLElement).style.display = 'flex';
  try {
    await register({ isExistingUser: true });
  } catch (err) {
    console.error(err);
  }
};

const validateEmail = async () => {
  try {
    const req = await fetch(`${config.apiUrl}/email/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: params.get('code') }),
      credentials: 'include',
    });

    const res = await req.json();

    if (!req.ok) {
      throw new Error(`Failed: ${req.statusText} ${JSON.stringify(res, null, 2)}`);
    }

    if (params.has('registerDevice')) {
      await registerDevice();
    }
    (window as Window).location = 'account.html';
  } catch (err) {
    feedbackTxt.innerText = (err as Error).message.includes('code not found')
      ? 'Verification code not found, has expired or you email has already been confirmed.'
      : 'There was an error while trying validate your account.';
    throw err;
  }
};

validateEmail();
