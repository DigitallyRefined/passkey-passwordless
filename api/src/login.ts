import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';

import * as users from './db/users.js';
import * as anonymousChallenges from './db/anonymousChallenges.js';

import { config } from './config.js';
import { getWebAuthnValidUntil } from './utils/index.js';
import { getJwtToken } from './account.js';

const {
  webUrl,
  webAuthnOptions: { rpID, timeout, userVerification },
} = config;

/**
 * Login (a.k.a. "Authentication")
 */
export const authenticationGenerateOptions = async ({ email }: users.User) => {
  const user = email ? await users.get({ email }, { requireEmailValidated: false }) : undefined;

  if (user?.verification.validated === false) {
    throw new Error('Account not verified');
  }

  const options = await generateAuthenticationOptions({
    timeout,
    allowCredentials:
      user?.credentials.map((credential) => ({
        id: credential.id,
        transports: credential.transports || [],
      })) || [],
    userVerification,
    rpID,
  });

  /**
   * The server needs to temporarily remember this value for verification, so don't lose it until
   * after you verify a passkey response.
   */
  if (user) {
    user.challenge.validUntil = getWebAuthnValidUntil();
    user.challenge.data = options.challenge;
    await users.replace({ email: user.email }, user);
  } else {
    anonymousChallenges.deleteOld();
    await anonymousChallenges.save(options.challenge);
  }

  return options;
};

export const authenticationVerify = async ({
  email,
  authenticationBody,
}: users.User & {
  authenticationBody: AuthenticationResponseJSON;
}) => {
  let user: users.User | undefined;
  let expectedChallenge: string | undefined = undefined;
  if (email) {
    user = await users.getForChallenge({ email }, true);
    expectedChallenge = user.challenge.data;
  } else if (authenticationBody.response.userHandle) {
    user = await users.get({
      id: isoBase64URL.toUTF8String(authenticationBody.response.userHandle),
    });

    const { challenge } = JSON.parse(
      Buffer.from(authenticationBody.response.clientDataJSON, 'base64') as any as string
    );
    if (await anonymousChallenges.exists(challenge)) {
      expectedChallenge = challenge;
    }
  } else {
    throw new Error('Unable to verify login');
  }

  if (!expectedChallenge) {
    throw new Error('Unable to verify login');
  }

  let dbCredential: users.WebAuthnCredentialDetails | undefined;
  // "Query the DB" here for a credential matching `credential.id`
  for (const credential of user.credentials) {
    if (credential.id === authenticationBody.rawId) {
      dbCredential = credential;
      break;
    }
  }

  if (!dbCredential) {
    throw new Error('Credential not found');
  }

  const verification = await verifyAuthenticationResponse({
    response: authenticationBody,
    expectedChallenge: `${expectedChallenge}`,
    expectedOrigin: webUrl,
    expectedRPID: rpID,
    credential: dbCredential,
    requireUserVerification: userVerification === 'required',
  });

  const { verified, authenticationInfo } = verification;

  if (verified) {
    // Update the credential's counter in the DB to the newest count in the authentication
    dbCredential.counter = authenticationInfo.newCounter;
    dbCredential.lastUsed = Date.now();
    await users.updateCredential({ email: user.email }, dbCredential);
  }

  return {
    verified,
    clientExtensionResults: dbCredential.clientExtensionResults,
    jwtToken: verified ? getJwtToken(user) : null,
  };
};
