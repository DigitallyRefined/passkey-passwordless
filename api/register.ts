import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import type {
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifiedRegistrationResponse,
} from '@simplewebauthn/server';
import { v4 as uuidv4 } from 'uuid';

import type { RegistrationCredentialJSON } from '@simplewebauthn/typescript-types';

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

  const opts: GenerateRegistrationOptionsOpts = {
    rpName,
    rpID,
    userID,
    userName: email,
    timeout,
    attestationType,
    excludeCredentials: existingUser
      ? existingUser.devices.map((device) => ({
          id: device.credentialID,
          type: 'public-key',
          transports: device.transports || [],
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
  };

  const options = generateRegistrationOptions(opts);

  /**
   * A simple way of storing a user's current challenge being signed by registration or authentication.
   * It should be expired after `timeout` milliseconds (optional argument for `generate` methods,
   * defaults to 60000ms)
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
      devices: [],
      challenge,
    });
    sendVerificationEmail(email, verificationCode);
  }

  return options;
};

export const registrationVerify = async (
  {
    email,
    credential,
  }: {
    email: string;
    credential: RegistrationCredentialJSON;
  },
  deviceName: string,
  requireEmailValidated = false
) => {
  const user = await users.getForChallenge({ email }, requireEmailValidated);

  const expectedChallenge = user.challenge.data;

  let verification: VerifiedRegistrationResponse;

  const opts: VerifyRegistrationResponseOpts = {
    credential,
    expectedChallenge: `${expectedChallenge}`,
    expectedOrigin,
    expectedRPID: rpID,
    requireUserVerification: userVerification === 'required',
  };
  verification = await verifyRegistrationResponse(opts);

  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    const { credentialPublicKey, credentialID, counter } = registrationInfo;

    const existingDevice = user.devices.find((device) => device.credentialID.equals(credentialID));

    if (!existingDevice) {
      /**
       * Add the returned device to the user's list of devices
       */
      const newDevice: users.AuthenticatorDeviceDetails = {
        credentialPublicKey,
        credentialID,
        counter,
        transports: credential.transports || [],
        clientExtensionResults: credential.clientExtensionResults,
        name: deviceName,
        lastUsed: Date.now(),
      };
      user.devices.push(newDevice);
      await users.replace({ email: user.email }, user);
    }
  }

  return { verified };
};
