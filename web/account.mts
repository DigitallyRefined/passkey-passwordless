import { config } from './config.mjs';

const accountReq = await fetch(`${config.apiUrl}/account`, {
  credentials: 'include',
});
const accountDetails = await accountReq.json();
if (!accountDetails.email) {
  (window as Window).location = '/';
  throw new Error('Not logged in');
}

(document.querySelector('#loggedInAs') as HTMLSpanElement).innerText = accountDetails.email;
(document.querySelector('#account') as HTMLSelectElement).style.visibility = 'visible';

document.querySelector('#logout')?.addEventListener('click', async (e) => {
  await fetch(`${config.apiUrl}/account/logout`, {
    credentials: 'include',
  });
  (window as Window).location = '/';
});
