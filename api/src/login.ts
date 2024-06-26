import {
  VerifiedAuthenticationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';

import * as users from './db/users';
import * as anonymousChallenges from './db/anonymousChallenges';

import { config } from './config';
import { getWebAuthnValidUntil } from './utils';
import { getJwtToken } from './account';

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
      user?.devices.map((device) => ({
        id: device.credentialID,
        transports: device.transports || [],
      })) || [],
    userVerification,
    rpID,
  });

  /**
   * The server needs to temporarily remember this value for verification, so don't lose it until
   * after you verify an authenticator response.
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

  let dbAuthenticator: users.AuthenticatorDeviceDetails | undefined;
  // "Query the DB" here for an authenticator matching `credentialID`
  for (const device of user.devices) {
    if (device.credentialID === authenticationBody.rawId) {
      dbAuthenticator = device;
      break;
    }
  }

  if (!dbAuthenticator) {
    throw new Error('Authenticator not found');
  }

  const verification = await verifyAuthenticationResponse({
    response: authenticationBody,
    expectedChallenge: `${expectedChallenge}`,
    expectedOrigin: webUrl,
    expectedRPID: rpID,
    authenticator: dbAuthenticator,
    requireUserVerification: userVerification === 'required',
  });

  const { verified, authenticationInfo } = verification;

  if (verified) {
    // Update the authenticator's counter in the DB to the newest count in the authentication
    dbAuthenticator.counter = authenticationInfo.newCounter;
    dbAuthenticator.lastUsed = Date.now();
    await users.updateDevice({ email: user.email }, dbAuthenticator);
  }

  return {
    verified,
    clientExtensionResults: dbAuthenticator.clientExtensionResults,
    jwtToken: verified ? getJwtToken(user) : null,
  };
};
