import * as jwt from 'jsonwebtoken';

import { JWT_SECRET } from './index';

import { doesUserExist, get, remove, removeDevice, replace, updateDevice, User } from './db/users';
import { registrationGenerateOptions, registrationVerify } from './register';
import { RegistrationCredentialJSON } from '@simplewebauthn/typescript-types';

export const getJwtToken = (user: User | null) =>
  user
    ? jwt.sign(
        {
          id: user.id,
          email: user.email,
          devices: user.devices.map((device) => ({
            credentialID: device.credentialID.toString('base64'),
            name: device.name,
            lastUsed: device.lastUsed,
          })),
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      )
    : '';

export const getAccount = async (user: User) => ({
  email: user.email,
  devices: user.devices,
});

export const updateAccount = async (user: User, { newEmail }: { newEmail: string }) => {
  if (await doesUserExist({ email: newEmail })) {
    throw new Error('Email already registered');
  }

  const userToUpdate = await get(user);
  userToUpdate.email = newEmail;
  userToUpdate.devices = [];
  await replace(user, userToUpdate);
  return { jwtToken: getJwtToken(userToUpdate) };
};

export const addDeviceGenerateOptions = async (user: User) => registrationGenerateOptions(user, await get(user));

export const addDeviceVerify = async (user: User, credential: RegistrationCredentialJSON, deviceName: string) => {
  await registrationVerify({ credential, email: user.email }, deviceName);
  return { jwtToken: getJwtToken(await get(user)) };
};

export const renameDevice = async (
  user: User,
  deviceIndex: string,
  { newName }: { credentialID: string; newName: string }
) => {
  const userToUpdate = await get(user);

  const deviceToUpdate = userToUpdate.devices[Number(deviceIndex)];
  if (!deviceToUpdate) throw new Error('Device not found');
  deviceToUpdate.name = newName;

  await updateDevice(userToUpdate, deviceToUpdate);

  return { jwtToken: getJwtToken(userToUpdate) };
};

export const deleteDevice = async (user: User, deviceIndex: string) => {
  const updatedUser = await removeDevice(user, Number(deviceIndex));

  return { jwtToken: getJwtToken(updatedUser) };
};

export const deleteAccount = remove;
