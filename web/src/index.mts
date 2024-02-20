import { authenticate } from './webauthn/authenticate.mjs';

/**
 * Authentication
 */
document.querySelector('#btnLogin')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (localStorage.getItem('canLoginWithResidentKey')) {
    try {
      const authenticationResult = await authenticate();
      if (authenticationResult.verified && !authenticationResult.requiresPassphrase) {
        (window as Window).location = 'account.html';
        return;
      } else {
        throw new Error(authenticationResult);
      }
    } catch (err) {
      localStorage.removeItem('canLoginWithResidentKey');
      console.log(err);
    }
  }

  (window as Window).location = (e.target as HTMLFormElement)?.action;
});
