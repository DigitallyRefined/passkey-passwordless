import { register } from './webauthn/register.mjs';

import { config } from './config.mjs';

const accountReq = await fetch(`${config.apiUrl}/account`, {
  credentials: 'include',
});
const accountDetails = await accountReq.json();
if (!accountDetails.email) {
  (window as Window).location = '/';
  throw new Error('Not logged in');
}

(document.querySelector('#email') as HTMLInputElement).value = accountDetails.email;

const getRelativeTimeSince = (pastDate: number) => {
  const diff = pastDate - new Date().valueOf();
  const seconds = diff / 1000;
  const minutes = seconds / 60;
  const hours = minutes / 60;
  const days = hours / 24;

  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: 'auto',
  });

  if (days < -1) {
    return formatter.format(Math.floor(days), 'day');
  }
  if (hours < -1) {
    return formatter.format(Math.floor(hours), 'hour');
  }
  if (minutes < -1) {
    return formatter.format(Math.floor(minutes), 'minute');
  }
  return formatter.format(Math.floor(seconds), 'second');
};

const credentialList = document.querySelector('#credentialList');
accountDetails.credentials?.map(
  ({ name, lastUsed }: { name: string; lastUsed: number }, idx: string) => {
    const credentialLi = document.createElement('li');
    credentialLi.id = idx;
    credentialLi.innerText = `${name} `;
    credentialLi.innerHTML += `<strong>Last used</strong> ${getRelativeTimeSince(lastUsed)}
        <a href="#" class="credentialRename">✏️ Rename</a>
        <a href="#" class="credentialRemove">❌ Remove</a>`;

    credentialList?.appendChild(credentialLi);
  }
);

(document.querySelector('#account') as HTMLElement).style.visibility = 'visible';

const logout = async () => {
  await fetch(`${config.apiUrl}/account/logout`, {
    credentials: 'include',
  });
  (window as Window).location = '/';
};

const handleRes = (isOk: boolean, action: string) => {
  if (isOk) {
    location.reload();
  } else {
    alert(`Error ${action}`);
  }
};

const addCredential = async ({ askForCredentialName = false } = {}) => {
  try {
    const registrationResult = await register({ isExistingUser: true, askForCredentialName });
    if (!(registrationResult === 'registered' || registrationResult === 'ok')) {
      throw new Error(registrationResult);
    }
    window.location.reload();
  } catch (err) {
    alert(`Error adding Passkey ${(err as Error)?.message}`);
  }
};

document.querySelector('#logout')?.addEventListener('click', async (e) => {
  await logout();
});

const form: HTMLFormElement | null = document.querySelector('#updateAccount');
form?.addEventListener('submit', async (e) => {
  if (!form.checkValidity()) {
    throw new Error('Fill out the form');
  }

  e.preventDefault();

  const newEmail = (document.querySelector('#email') as HTMLInputElement)?.value;

  if (accountDetails.email === newEmail) {
    alert('Email address has not changed');
    return;
  }

  const req = await fetch(`${config.apiUrl}/account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ newEmail }),
    credentials: 'include',
  });
  if (!req.ok) {
    const err = await req.json();
    alert(`Error updating account ${err?.code}`);
    return;
  }

  await addCredential();
  await logout();
});

document.querySelectorAll('.credentialRename').forEach((el) =>
  el?.addEventListener('click', async (e) => {
    const { id } = (e.target as HTMLAnchorElement).parentNode as HTMLLIElement;
    const newName = prompt('Rename Passkey to', accountDetails.credentials[id].name);
    if (newName) {
      const req = await fetch(`${config.apiUrl}/account/credential/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newName }),
        credentials: 'include',
      });

      handleRes(req.ok, 'updating');
    }
  })
);

document.querySelectorAll('.credentialRemove').forEach((el) =>
  el?.addEventListener('click', async (e) => {
    if (confirm('Are you sure you want to remove this Passkey?') === true) {
      const req = await fetch(
        `${config.apiUrl}/account/credential/${
          ((e.target as HTMLAnchorElement).parentNode as HTMLLIElement)?.id
        }`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      handleRes(req.ok, 'removing');
    }
  })
);

document.querySelector('#credentialAdd')?.addEventListener('click', async (e) => {
  await addCredential({ askForCredentialName: true });
});

document.querySelector('#deleteAccount')?.addEventListener('click', async (e) => {
  if (confirm('Are you sure you want to delete your account?') === true) {
    const req = await fetch(`${config.apiUrl}/account`, {
      method: 'DELETE',
      credentials: 'include',
    });

    handleRes(req.ok, 'deleting');
  }
});
