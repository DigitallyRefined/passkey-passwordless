import { authenticate } from './webauthn/authenticate.mjs';

const loginForm: HTMLFormElement | null = document.querySelector('#loginForm');
const feedbackTxt: HTMLParagraphElement | null = document.querySelector('#feedbackTxt');

/**
 * Authentication via email & passkey
 */
const login = async (email?: string, passphraseAttempt?: string) => {
  if (!feedbackTxt) {
    return;
  }

  // Reset success/error messages
  feedbackTxt.innerText = '';

  try {
    const authenticationResult = await authenticate({
      email,
      emailLoginLinkOnFailure: true,
      passphraseAttempt,
    });
    if (!authenticationResult.jwtToken && authenticationResult.requiresPassphrase) {
      (document.querySelector('#email') as HTMLInputElement).value = authenticationResult.email;
      (document.querySelector('#requiresPassphrase') as HTMLParagraphElement).style.display =
        'block';
      (document.querySelector('#passphrase') as HTMLInputElement).focus();
    } else if (authenticationResult.verified) {
      (window as Window).location = 'account.html';
    } else {
      if (loginForm && authenticationResult?.hideLogin) loginForm.style.display = 'none';
      feedbackTxt.innerText = authenticationResult.error;
    }
  } catch (err) {
    feedbackTxt.innerText =
      'We were unable to sign in automatically, please login using your email address.';
    throw err;
  }
};

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!loginForm.checkValidity()) {
    throw new Error('Fill out the form');
  }

  const email = (document.querySelector('#email') as HTMLInputElement | null)?.value;
  const passphrase = (document.querySelector('#passphrase') as HTMLInputElement | null)?.value;

  await login(email, passphrase);
});

document.querySelector('#loginWithKey')?.addEventListener('click', async (e) => {
  e.preventDefault();

  await login();
});
