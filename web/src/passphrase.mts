import { config } from './config.mjs';

const accountReq = await fetch(`${config.apiUrl}/account`, {
  credentials: 'include',
});
const accountDetails = await accountReq.json();
if (!accountDetails.email) {
  (window as Window).location = '/';
  throw new Error('Not logged in');
}

(document.querySelector('#managePassphrase') as HTMLElement).style.visibility = 'visible';

if (accountDetails.hasPassphrase) {
  (document.querySelectorAll('.hasPassphrase') as NodeListOf<HTMLElement>).forEach(
    (i) => (i.style.display = 'block')
  );

  if (accountDetails.usePassphraseAsWellAsLoginDevice) {
    const usePassphraseAsWellAsLoginDevice: HTMLInputElement | null = document.querySelector(
      '#usePassphraseAsWellAsLoginDevice'
    );
    if (usePassphraseAsWellAsLoginDevice) usePassphraseAsWellAsLoginDevice.checked = true;
  }
}

const updatePassphrase =
  ({ removePassphrase, validateForm } = { removePassphrase: false, validateForm: true }) =>
  async (e: Event) => {
    e.preventDefault();

    try {
      if (validateForm && !passphraseForm?.checkValidity()) {
        throw new Error('Fill out the form');
      }

      const res = await fetch(`${config.apiUrl}/account/passphrase`, {
        method: removePassphrase ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassphrase: (
            document.querySelector('#currentPassphrase') as HTMLInputElement | null
          )?.value,
          newPassphrase: (document.querySelector('#newPassphrase') as HTMLInputElement | null)
            ?.value,
          newPassphraseConfirm: (
            document.querySelector('#newPassphraseConfirm') as HTMLInputElement | null
          )?.value,
          usePassphraseAsWellAsLoginDevice: (
            document.querySelector('#usePassphraseAsWellAsLoginDevice') as HTMLInputElement | null
          )?.checked,
        }),
        credentials: 'include',
      });

      const resJson = await res.json();

      if (!res.ok) {
        throw new Error(resJson.code);
      }
    } catch (err) {
      console.error(err);
      alert(err);
    } finally {
      document.location.reload();
    }
  };

const passphraseForm: HTMLFormElement | null = document.querySelector('#passphraseForm');
passphraseForm?.addEventListener('submit', updatePassphrase());

document
  .querySelector('#usePassphraseAsWellAsLoginDevice')
  ?.addEventListener('click', updatePassphrase({ removePassphrase: false, validateForm: false }));

document
  .querySelector('#btnRemovePassphrase')
  ?.addEventListener('click', updatePassphrase({ removePassphrase: true, validateForm: false }));

document.querySelector('#logout')?.addEventListener('click', async (e) => {
  await fetch(`${config.apiUrl}/account/logout`, {
    credentials: 'include',
  });
  (window as Window).location = '/';
});
