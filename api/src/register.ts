import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import { v4 as uuidv4 } from 'uuid';

import type { RegistrationResponseJSON } from '@simplewebauthn/types';

import * as users from './db/users';
import type { User } from './db/users';
import { config } from './config';
import {
  getTenMinutesFromNow as tenMinutesFromNow,
  getWebAuthnValidUntil,
  sendVerificationEmail,
} from './utils';

const {
  webUrl,
  webAuthnOptions: {
    rpID,
    rpName,
    timeout,
    attestationType,
    authenticatorAttachment,
    residentKey,
    userVerification,
  },
} = config;

// This value is set at the bottom of page as part of server initialization (the empty string is
// to appease TypeScript until we determine the expected origin based on whether or not HTTPS
// support is enabled)
export const expectedOrigin = webUrl;

/**
 * Registration (a.k.a. "Registration")
 */
export const registrationGenerateOptions = async ({ email }: User, existingUser?: User) => {
  if (!existingUser && (await users.doesUserExist({ email }))) {
    throw new Error('Email already registered');
  }

  const userID = existingUser?.id || uuidv4();

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: isoUint8Array.fromUTF8String(userID),
    userName: email,
    timeout,
    attestationType,
    excludeCredentials: existingUser
      ? existingUser.credentials.map((credential) => ({
          id: credential.id,
          transports: credential.transports || [],
        }))
      : [],
    /**
     * The optional authenticatorSelection property allows for specifying more constraints around
     * the types of authenticators that users to can use for registration
     */
    authenticatorSelection: {
      authenticatorAttachment,
      userVerification,
      residentKey,
    },
    /**
     * Support the two most common algorithms: ES256, and RS256
     */
    supportedAlgorithmIDs: [-7, -257],
  });

  /**
   * A simple way of storing a user's current challenge being signed by registration or authentication.
   * It should be expired after `timeout` milliseconds (optional argument for `generate` methods,
   * defaults to 150000ms)
   *
   * The server needs to temporarily remember this value for verification, so don't lose it until
   * after you verify an authenticator response.
   */
  const challenge = {
    validUntil: getWebAuthnValidUntil(),
    data: options.challenge,
  };

  if (existingUser) {
    existingUser.challenge = challenge;
    await users.replace(existingUser, existingUser);
  } else {
    const verificationCode = uuidv4();
    await users.create({
      id: userID,
      email,
      verification: {
        validated: false,
        validUntil: tenMinutesFromNow(),
        data: verificationCode,
      },
      credentials: [],
      challenge,
    });
    sendVerificationEmail(email, verificationCode);
  }

  return options;
};

export const registrationVerify = async (
  {
    email,
    registrationBody,
  }: {
    email: string;
    registrationBody: RegistrationResponseJSON;
  },
  credentialName: string,
  requireEmailValidated = false
) => {
  const user = await users.getForChallenge({ email }, requireEmailValidated);

  const expectedChallenge = user.challenge.data;

  const verification = await verifyRegistrationResponse({
    response: registrationBody,
    expectedChallenge: `${expectedChallenge}`,
    expectedOrigin,
    expectedRPID: rpID,
    requireUserVerification: userVerification === 'required',
  });

  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    const {
      credential: { publicKey, id, counter },
    } = registrationInfo;

    const existingCredential = user.credentials.find((credential) => credential.id === id);

    if (!existingCredential) {
      /**
       * Add the returned credential to the user's list of credentials
       */
      const newCredential: users.WebAuthnCredentialDetails = {
        publicKey,
        id,
        counter,
        transports: registrationBody.response.transports || [],
        clientExtensionResults: registrationBody.clientExtensionResults,
        name: credentialName,
        lastUsed: Date.now(),
      };
      user.credentials.push(newCredential);
      await users.replace({ email: user.email }, user);
    }
  }

  return { verified };
};
