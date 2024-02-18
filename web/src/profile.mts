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

const deviceList = document.querySelector('#deviceList');
accountDetails.devices?.map(
  ({ name, lastUsed }: { name: string; lastUsed: number }, idx: string) => {
    const deviceLi = document.createElement('li');
    deviceLi.id = idx;
    deviceLi.innerText = `${name} `;
    deviceLi.innerHTML += `<strong>Last used</strong> ${getRelativeTimeSince(lastUsed)}
        <a href="#" class="deviceRename">✏️ Rename</a>
        <a href="#" class="deviceRemove">❌ Remove</a>`;

    deviceList?.appendChild(deviceLi);
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

const addDevice = async ({ askForDeviceName = false } = {}) => {
  try {
    const registrationResult = await register({ isExistingUser: true, askForDeviceName });
    if (!(registrationResult === 'registered' || registrationResult === 'ok')) {
      throw new Error(registrationResult);
    }
    window.location.reload();
  } catch (err) {
    alert(`Error adding device ${(err as Error)?.message}`);
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

  await addDevice();
  await logout();
});

document.querySelectorAll('.deviceRename').forEach((el) =>
  el?.addEventListener('click', async (e) => {
    const { id } = (e.target as HTMLAnchorElement).parentNode as HTMLLIElement;
    const newName = prompt('Rename device to', accountDetails.devices[id].name);
    if (newName) {
      const req = await fetch(`${config.apiUrl}/account/device/${id}`, {
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

document.querySelectorAll('.deviceRemove').forEach((el) =>
  el?.addEventListener('click', async (e) => {
    if (confirm('Are you sure you want to remove this device?') === true) {
      const req = await fetch(
        `${config.apiUrl}/account/device/${
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

document.querySelector('#deviceAdd')?.addEventListener('click', async (e) => {
  await addDevice({ askForDeviceName: true });
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
