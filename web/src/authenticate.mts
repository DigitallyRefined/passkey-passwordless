import { authenticate } from './webauthn/authenticate.mjs';

const loginForm: HTMLFormElement | null = document.querySelector('#loginForm');
const feedbackTxt: HTMLParagraphElement | null = document.querySelector('#feedbackTxt');

/**
 * Authentication via email & passkey
 */
const login = async (email?: string) => {
  if (!feedbackTxt) {
    return;
  }

  // Reset success/error messages
  feedbackTxt.innerText = '';

  try {
    const authenticationResult = await authenticate({ email, emailLoginLinkOnFailure: true });
    if (authenticationResult.verified) {
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

  const email = (document.querySelector('#email') as HTMLInputElement)?.value;

  await login(email);
});

document.querySelector('#loginWithKey')?.addEventListener('click', async (e) => {
  e.preventDefault();

  await login();
});
