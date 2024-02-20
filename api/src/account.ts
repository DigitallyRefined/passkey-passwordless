import * as jwt from 'jsonwebtoken';
import { RegistrationResponseJSON } from '@simplewebauthn/typescript-types';
import { v4 as uuidv4 } from 'uuid';

import { JWT_SECRET } from './index';

import * as users from './db/users';
import type { User } from './db/users';
import { registrationGenerateOptions, registrationVerify } from './register';
import { getTenMinutesFromNow, sendVerificationEmail } from './utils';
import { generateHashedPassphrase, verifyPassphrase } from './utils/hash';

export const getJwtToken = (user: User | null) =>
  user
    ? jwt.sign(
        {
          id: user.id,
          email: user.email,
          devices: user.devices.map((device) => ({
            credentialID: device.credentialID,
            name: device.name,
            lastUsed: device.lastUsed,
          })),
          hasPassphrase: Boolean(user.passphrase),
          usePassphraseAsWellAsLoginDevice: user.usePassphraseAsWellAsLoginDevice,
        } as users.JwtData,
        JWT_SECRET,
        { expiresIn: '24h' }
      )
    : '';

export const getAccount = (user: users.JwtData) => ({
  email: user.email,
  devices: user.devices,
  hasPassphrase: user.hasPassphrase,
  usePassphraseAsWellAsLoginDevice: user.usePassphraseAsWellAsLoginDevice,
});

export const sendValidationEmail = async ({ id, email }: User) => {
  const userToUpdate = await users.get(id ? { id } : { email }, { requireEmailValidated: false });
  if (!userToUpdate || (!id && !email)) {
    throw new Error('User not found');
  }
  const verificationCode = uuidv4();
  userToUpdate.verification.validUntil = getTenMinutesFromNow();
  userToUpdate.verification.data = verificationCode;
  await users.replace({ email: userToUpdate.email }, userToUpdate);
  sendVerificationEmail(userToUpdate.email, verificationCode, true);
};

export const emailVerify = async (code: string, passphraseAttempt: string) => {
  if (!code) {
    throw new Error('Missing email verification code');
  }

  const user = await users.getByEmailValidationCode(code);
  if (user.passphrase) {
    if (!passphraseAttempt) {
      return { requiresPassphrase: true };
    }

    if (!(await verifyPassphrase(user.passphrase, passphraseAttempt))) {
      throw new Error('Invalid passphrase');
    }
  }

  const updatedUser = await users.validateEmailCode(code);

  return { jwtToken: getJwtToken(updatedUser) };
};

export const updateAccount = async (user: User, { newEmail }: { newEmail: string }) => {
  if (await users.doesUserExist({ email: newEmail })) {
    throw new Error('Email already registered');
  }

  const userToUpdate = await users.get(user);
  userToUpdate.email = newEmail;
  userToUpdate.devices = [];
  await users.replace(user, userToUpdate);
  return { jwtToken: getJwtToken(userToUpdate) };
};

export const addDeviceGenerateOptions = async (user: User) =>
  registrationGenerateOptions(user, await users.get(user));

export const addDeviceVerify = async (
  user: User,
  registrationBody: RegistrationResponseJSON,
  deviceName: string
) => {
  await registrationVerify({ registrationBody, email: user.email }, deviceName, true);
  return { jwtToken: getJwtToken(await users.get(user)) };
};

export const renameDevice = async (
  user: User,
  deviceIndex: string,
  { newName }: { credentialID: string; newName: string }
) => {
  const userToUpdate = await users.get(user);

  const deviceToUpdate = userToUpdate.devices[Number(deviceIndex)];
  if (!deviceToUpdate) throw new Error('Device not found');
  deviceToUpdate.name = newName;

  await users.updateDevice(userToUpdate, deviceToUpdate);

  return { jwtToken: getJwtToken(userToUpdate) };
};

export const deleteDevice = async (user: User, deviceIndex: string) => {
  const updatedUser = await users.removeDevice(user, Number(deviceIndex));

  return { jwtToken: getJwtToken(updatedUser) };
};

export const updatePassphrase = async (
  user: User,
  {
    currentPassphrase,
    newPassphrase,
    newPassphraseConfirm,
    usePassphraseAsWellAsLoginDevice = false,
  }: {
    currentPassphrase: string;
    newPassphrase: string;
    newPassphraseConfirm: string;
    usePassphraseAsWellAsLoginDevice: boolean;
  }
) => {
  if (newPassphrase !== newPassphraseConfirm) {
    throw new Error('Passwords do not match');
  }

  const userToUpdate = await users.get(user);

  if (
    userToUpdate.passphrase &&
    !(await verifyPassphrase(userToUpdate.passphrase, currentPassphrase))
  ) {
    throw new Error('Current passphrase is incorrect');
  }

  if (newPassphrase) {
    if (newPassphrase.length < 12 || !newPassphrase.match(/.*[ ].*/)) {
      throw new Error('Passphrase needs to be 12 characters long and contain at least one space');
    }
    userToUpdate.passphrase = await generateHashedPassphrase(newPassphrase);
  }

  userToUpdate.usePassphraseAsWellAsLoginDevice = usePassphraseAsWellAsLoginDevice;

  await users.replace(user, userToUpdate);
  return { jwtToken: getJwtToken(userToUpdate) };
};

export const deletePassphrase = async (user: User, currentPassphrase: string) => {
  const userToUpdate = await users.get(user);

  if (
    userToUpdate.passphrase &&
    !(await verifyPassphrase(userToUpdate.passphrase, currentPassphrase))
  ) {
    throw new Error('Current passphrase is incorrect');
  }

  userToUpdate.passphrase = undefined;
  userToUpdate.usePassphraseAsWellAsLoginDevice = false;

  await users.replace(user, userToUpdate);
  return { jwtToken: getJwtToken(userToUpdate) };
};

export const deleteAccount = users.remove;
