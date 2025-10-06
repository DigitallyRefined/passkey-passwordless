import jwt from 'jsonwebtoken';
import { RegistrationResponseJSON } from '@simplewebauthn/server';
import { v4 as uuidv4 } from 'uuid';

import { JWT_SECRET } from './index.js';

import * as users from './db/users.js';
import type { User } from './db/users.js';
import { registrationGenerateOptions, registrationVerify } from './register.js';
import { getTenMinutesFromNow, sendVerificationEmail } from './utils/index.js';

export const getJwtToken = (user: User | null) =>
  user
    ? jwt.sign(
        {
          id: user.id,
          email: user.email,
          credentials: user.credentials.map((credential) => ({
            id: credential.id,
            name: credential.name,
            lastUsed: credential.lastUsed,
          })),
        } as users.JwtData,
        JWT_SECRET,
        { expiresIn: '24h' }
      )
    : '';

export const getAccount = (user: users.JwtData) => ({
  email: user.email,
  credentials: user.credentials,
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

export const emailVerify = async (code: string) => {
  if (!code) {
    throw new Error('Missing email verification code');
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
  userToUpdate.credentials = [];
  await users.replace(user, userToUpdate);
  return { jwtToken: getJwtToken(userToUpdate) };
};

export const addCredentialGenerateOptions = async (user: User) =>
  registrationGenerateOptions(user, await users.get(user));

export const addCredentialVerify = async (
  user: User,
  registrationBody: RegistrationResponseJSON,
  credentialName: string
) => {
  await registrationVerify({ registrationBody, email: user.email }, credentialName, true);
  return { jwtToken: getJwtToken(await users.get(user)) };
};

export const renameCredential = async (
  user: User,
  credentialIndex: string,
  { newName }: { id: string; newName: string }
) => {
  const userToUpdate = await users.get(user);

  const credentialToUpdate = userToUpdate.credentials[Number(credentialIndex)];
  if (!credentialToUpdate) throw new Error('Credential not found');
  credentialToUpdate.name = newName;

  await users.updateCredential(userToUpdate, credentialToUpdate);

  return { jwtToken: getJwtToken(userToUpdate) };
};

export const deleteCredential = async (user: User, credentialIndex: string) => {
  const updatedUser = await users.removeCredential(user, Number(credentialIndex));

  return { jwtToken: getJwtToken(updatedUser) };
};

export const deleteAccount = users.remove;
