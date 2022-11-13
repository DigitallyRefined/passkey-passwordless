# WebAuthn Passwordless

An example WebAuthn application showing how passwordless registration and authentication journeys work.

Includes progressive enhancement for devices that support saving usernames and keys (via resident storage), account management to add additional devices and fallback to magic email login links for devices that don't support (or cancel) WebAuthn.

Includes web frontend (nginx), API (Node/Express), Database (Mongo), and a Database viewer (Mongo Express).

## Quick start

Prerequisites: [Node](https://nodejs.org/) and [Docker](https://www.docker.com/) should be installed.

1. `npm install`
2. `npm start`

## Usage

1. http://localhost:3000 to register and login
2. Check the console output for the email confirmation links
3. Open "DevTools > Console > More tools (hamburger menu) > WebAuthn > Enable virtual authenticator environment" to try out different key types
4. http://localhost:8081 to check the user database
5. Attempt to login from different devices, desktop vs. mobile
6. Reset database via `npm run reset:db`
7. Optionally set the SMTP settings in `apps.env` to send email and change `config.ts` to match your domain and security requirements

## Managing WebAuthn keys

### Android

Open "Settings > Passwords and accounts > Google (under Passwords)" tapping each login allows you to edit or delete it.

#### As a linked security device/phone

On both Android and desktop in Chrome/Chromium based browsers navigate to "Settings > Privacy and security > Phone as a security key/Manage phones" to remove linked devices.

### Windows

To view WebAuthn keys stored by Windows Hello, from a command prompt, run:

`certutil -csp NGC -key`

WebAuthn keys have names that look like `<sid>/<guid>/FIDO_AUTHENTICATOR//<rpIdHash>_<user id>`

You need to identify the key that you want to delete, and then to delete a WebAuthn key, from an administrator command prompt, run:

`certutil -csp NGC -delkey <name>` Replacing `<name>` with the full pathname from the output of the command above.

### YubiKey

[YubiKey 5](https://support.yubico.com/hc/en-us/articles/360016649339-YubiKey-5C-NFC) and higher: use the [Yubico Authenticator app](https://www.yubico.com/products/yubico-authenticator/) (running as Administrator), clicking through to the WebAuthn settings and entering the keys passphrase to view stored keys. In Chromium based browsers on Linux, security keys can also be managed via "Settings > Privacy and security > Security > Manage security keys".

Older YubiKeys (such as [U2F keys](https://support.yubico.com/hc/en-us/articles/360013656800-FIDO-U2F-Security-Key)) do not store resident keys and use a computed public/private key, as there no data stored on the key.

## See also

- [WebAuthn.io](https://webauthn.io/)
- [FIDO2 - FIDO Alliance](https://fidoalliance.org/fido2/)
- [SimpleWebAuthn Project](https://github.com/MasterKale/SimpleWebAuthn)
- [Can I use Search WebAuthn? - Browser support](https://caniuse.com/?search=webauthn)
- [Google - Build your first WebAuthn app](https://developers.google.com/codelabs/webauthn-reauth)
- [Bringing passkeys to Android & Chrome](https://android-developers.googleblog.com/2022/10/bringing-passkeys-to-android-and-chrome.html)
