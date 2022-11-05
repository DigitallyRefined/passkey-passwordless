import {
  generateAuthenticationOptions,
  GenerateAuthenticationOptionsOpts,
  VerifiedAuthenticationResponse,
  verifyAuthenticationResponse,
  VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server';
import base64url from 'base64url';

import type { AuthenticationCredentialJSON } from '@simplewebauthn/typescript-types';

import { inMemoryChallenges, inMemoryUserDeviceDB } from './inMemoryDb';
import { config } from './config';
import { User } from './db/register';

const {
  webUrl,
  webAuthnOptions: { rpID, timeout, userVerification },
} = config;

/**
 * Login (a.k.a. "Authentication")
 */
export const authenticationGenerateOptions = ({ id, email }: any) => {
  // You need to know the user by this point
  const user = inMemoryUserDeviceDB[email];

  const opts: GenerateAuthenticationOptionsOpts = {
    timeout,
    allowCredentials:
      user?.devices.map((dev) => ({
        id: dev.credentialID,
        type: 'public-key',
        transports: dev.transports,
      })) || [],
    userVerification,
    rpID,
  };

  const options = generateAuthenticationOptions(opts);

  /**
   * The server needs to temporarily remember this value for verification, so don't lose it until
   * after you verify an authenticator response.
   */
  if (user) {
    user.currentChallenge = options.challenge;
  } else {
    inMemoryChallenges.push(options.challenge);
  }

  return options;
};

export const authenticationVerify = async ({
  email,
  credential,
}: {
  email: string;
  credential: AuthenticationCredentialJSON;
}) => {
  let user: any;
  let expectedChallenge: string | undefined = undefined;
  if (email) {
    user = inMemoryUserDeviceDB[email];
    expectedChallenge = user.currentChallenge;
  } else if (credential.response.userHandle) {
    const findEmail = Object.keys(inMemoryUserDeviceDB).find(
      (key: string) => inMemoryUserDeviceDB[key].id === credential.response.userHandle
    );
    if (!findEmail) {
      throw new Error('User not registered');
    }
    user = inMemoryUserDeviceDB[findEmail];

    const { challenge } = JSON.parse(Buffer.from(credential.response.clientDataJSON, 'base64') as any as string);
    console.log({ challenge });
    if (inMemoryChallenges.includes(challenge)) expectedChallenge = challenge;
  } else {
    throw new Error('Unable to verify login');
  }

  if (!user) {
    throw new Error('User not registered');
  }

  console.log(JSON.stringify({ email, credential, inMemoryUserDeviceDB, user }, null, 2));

  let dbAuthenticator;
  const bodyCredIDBuffer = base64url.toBuffer(credential.rawId);
  // "Query the DB" here for an authenticator matching `credentialID`
  for (const dev of user.devices) {
    if (dev.credentialID.equals(bodyCredIDBuffer)) {
      dbAuthenticator = dev;
      break;
    }
  }

  if (!dbAuthenticator) {
    throw new Error('Authenticator is not registered with this site');
  }

  let verification: VerifiedAuthenticationResponse;
  const opts: VerifyAuthenticationResponseOpts = {
    credential,
    expectedChallenge: `${expectedChallenge}`,
    expectedOrigin: webUrl,
    expectedRPID: rpID,
    authenticator: dbAuthenticator,
    requireUserVerification: userVerification === 'required',
  };
  verification = await verifyAuthenticationResponse(opts);

  const { verified, authenticationInfo } = verification;

  if (verified) {
    // Update the authenticator's counter in the DB to the newest count in the authentication
    dbAuthenticator.counter = authenticationInfo.newCounter;
  }

  console.log(JSON.stringify({ user, verified, authenticationInfo }, null, 2));

  return { verified, clientExtensionResults: dbAuthenticator.clientExtensionResults };
};
