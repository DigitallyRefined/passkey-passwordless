# WebAuthn Passwordless

An example WebAuthn application showing how passwordless registration and authentication journeys work. Includes progressive enhancement for devices that support saving usernames and keys (via resident storage) and account management to add additional devices.

Includes web frontend (nginx), API (Node/Express), Database (Mongo), and a Database viewer (Mongo Express).

Prerequisites: install [Node](https://nodejs.org/) and [Docker](https://www.docker.com/)

Quick start:

1. `npm install`
2. `npm start`
3. http://localhost:3000 WebAuthn Passwordless register and login
4. Check browsers saved keys. On Chromium based browsers this can be found in "Settings > Privacy and security > Security > Manage security keys/phones"
5. Open "DevTools > Show console drawer > WebAuthn" to try out different key types
6. http://localhost:8081 Check user database
7. Attempt to login from different devices, desktop vs. mobile
8. Reset database via `npm reset:db`
