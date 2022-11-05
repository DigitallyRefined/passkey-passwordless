import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import type {
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifiedRegistrationResponse,
} from '@simplewebauthn/server';
import { v4 as uuidv4 } from 'uuid';

import type { RegistrationCredentialJSON } from '@simplewebauthn/typescript-types';
import type Platform from 'platform';

import * as users from './db/users';
import type { User } from './db/users';
import { config } from './config';
import { getWebAuthnValidUntil } from './db/index';

const {
  webUrl,
  webAuthnOptions: { rpID, rpName, timeout, attestationType, authenticatorAttachment, residentKey, userVerification },
} = config;

// This value is set at the bottom of page as part of server initialization (the empty string is
// to appease TypeScript until we determine the expected origin based on whether or not HTTPS
// support is enabled)
export const expectedOrigin = webUrl;

/**
 * Registration (a.k.a. "Registration")
 */
export const registrationGenerateOptions = async ({ email }: User) => {
  if (await users.doesUserExist({ email })) {
    throw new Error('Email address already registered');
  }

  const newUserId = uuidv4();

  const opts: GenerateRegistrationOptionsOpts = {
    rpName,
    rpID,
    userID: newUserId,
    userName: email,
    timeout,
    attestationType,

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

  await users.create({
    id: newUserId,
    email,
    devices: [],
    /**
     * A simple way of storing a user's current challenge being signed by registration or authentication.
     * It should be expired after `timeout` milliseconds (optional argument for `generate` methods,
     * defaults to 60000ms)
     *
     * The server needs to temporarily remember this value for verification, so don't lose it until
     * after you verify an authenticator response.
     */
    challenge: {
      validUntil: getWebAuthnValidUntil(),
      data: options.challenge,
    },
  });

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
  platform: typeof Platform
) => {
  const user = await users.getForChallenge({ email });

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
        transports: credential.transports,
        clientExtensionResults: credential.clientExtensionResults,
        name: [platform.name, platform.product, platform.os?.family].filter(Boolean).join(' '),
        lastUsed: Date.now(),
      };
      user.devices.push(newDevice);
      await users.replace({ email: user.email }, user);
    }
  }

  return { verified };
};
