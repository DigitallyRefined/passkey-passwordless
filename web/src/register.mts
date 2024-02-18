import { register } from './webauthn/register.mjs';

const regForm: HTMLFormElement | null = document.querySelector('#regForm');
const feedbackTxt = document.querySelector('#feedbackTxt') as HTMLParagraphElement;

/**
 * Registration
 */
regForm?.addEventListener('submit', async (e) => {
  // Reset success/error messages
  feedbackTxt.innerText = '';

  const email = (document.querySelector('#email') as HTMLInputElement).value;

  if (!regForm.checkValidity()) {
    throw new Error('Fill out the form');
  }

  e.preventDefault();

  try {
    const registrationResult = await register({ email });
    if (registrationResult === 'registered' || registrationResult === 'ok') {
      regForm.style.display = 'none';
      feedbackTxt.innerText = `Check your email/console, we've sent you a login link. ${
        registrationResult === 'registered' ? ' Authenticator registered.' : ''
      }`;
    } else {
      feedbackTxt.innerText = registrationResult;
    }
  } catch (err) {
    feedbackTxt.innerText = 'There was an error during registration.';
    throw err;
  }
});
