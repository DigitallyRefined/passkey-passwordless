import { register } from './webauthn/register.mjs';

import { config } from './config.mjs';

const feedbackTxt = document.querySelector('#feedbackTxt') as HTMLParagraphElement;
const passphraseForm = document.querySelector('#passphraseForm') as HTMLInputElement;

const params = new URLSearchParams(window.location.search);

const registerCredential = async () => {
  (document.querySelector('.alert') as HTMLElement).style.display = 'flex';
  try {
    await register({ isExistingUser: true });
  } catch (err) {
    console.error(err);
  }
};

const validateEmail = async (passphrase?: string) => {
  try {
    const req = await fetch(`${config.apiUrl}/email/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: params.get('code'), passphrase }),
      credentials: 'include',
    });

    const res = await req.json();

    if (!req.ok) {
      throw new Error(`Failed: ${req.statusText} ${JSON.stringify(res, null, 2)}`);
    }

    if (params.has('registerCredential')) {
      if (res.requiresPassphrase && !res.jwtToken) {
        passphraseForm.style.display = 'block';
      } else {
        await registerCredential();
        (window as Window).location = 'account.html';
      }
    } else if (res.jwtToken) {
      (window as Window).location = 'account.html';
    }
  } catch (err) {
    if ((err as Error).message.includes('code not found')) {
      feedbackTxt.innerText = 'Verification code was not found or it has expired.';
    } else if ((err as Error).message.includes('Invalid passphrase')) {
      feedbackTxt.innerText = 'Invalid passphrase.';
    } else {
      feedbackTxt.innerText = 'There was an error while trying validate your account.';
    }
    throw err;
  }
};

passphraseForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const passphrase = (document.querySelector('#passphrase') as HTMLInputElement | null)?.value;
  await validateEmail(passphrase);
});

validateEmail();
