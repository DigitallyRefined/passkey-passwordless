import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import type {
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifiedRegistrationResponse,
} from '@simplewebauthn/server';
import { v4 as uuidv4 } from 'uuid';

import type { RegistrationCredentialJSON, AuthenticatorDevice } from '@simplewebauthn/typescript-types';
import { User } from './db/register';
import { inMemoryUserDeviceDB } from './inMemoryDb';
import { config } from './config';

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
export const registrationGenerateOptions = ({ email }: User) => {
  if (inMemoryUserDeviceDB[email]) {
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

  inMemoryUserDeviceDB[email] = {
    id: newUserId,
    username: email,
    devices: [],
    /**
     * A simple way of storing a user's current challenge being signed by registration or authentication.
     * It should be expired after `timeout` milliseconds (optional argument for `generate` methods,
     * defaults to 60000ms)
     *
     * The server needs to temporarily remember this value for verification, so don't lose it until
     * after you verify an authenticator response.
     */
    currentChallenge: options.challenge,
  };

  console.log(JSON.stringify({ options }, null, 2));

  return options;
};

export const registrationVerify = async ({
  email,
  credential,
}: {
  email: string;
  credential: RegistrationCredentialJSON;
}) => {
  console.log(JSON.stringify({ credential, inMemoryUserDeviceDB }, null, 2));

  const user = inMemoryUserDeviceDB[email];

  const expectedChallenge = user.currentChallenge;

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
      const newDevice: AuthenticatorDevice & { clientExtensionResults: AuthenticationExtensionsClientOutputs } = {
        credentialPublicKey,
        credentialID,
        counter,
        transports: credential.transports,
        clientExtensionResults: credential.clientExtensionResults,
      };
      user.devices.push(newDevice);
    }
  }

  console.log(JSON.stringify({ inMemoryUserDeviceDB }, null, 2));

  return { verified };
};
