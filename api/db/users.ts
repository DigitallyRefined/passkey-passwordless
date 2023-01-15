import { AuthenticatorDevice } from '@simplewebauthn/typescript-types';
import { convertMongoDbBinaryToBuffer, database } from './index';

export interface AuthenticatorDeviceDetails extends AuthenticatorDevice {
  name?: string;
  lastUsed?: number;
  clientExtensionResults?: AuthenticationExtensionsClientOutputs;
}

export interface User {
  /**
   * 2FA and Passwordless WebAuthn flows expect you to be able to uniquely identify the user that
   * performs registration or authentication. The user ID you specify here should be your internal,
   * _unique_ ID for that user (uuid, etc...). Avoid using identifying information here, like email
   * addresses, as it may be stored within the authenticator.
   */
  id: string;
  /**
   * The username can be a human-readable name, email, etc... as it is intended only for display.
   */
  email: string;
  verification: {
    validated: boolean;
    validUntil: number;
    data: string;
  };
  devices: AuthenticatorDeviceDetails[];
  challenge: {
    validUntil: number;
    data: string;
  };
}

export type JwtData = Pick<User, 'id' | 'email' | 'devices'>;

const users = database.collection<User>('users');

export const create = async (user: User) => {
  // Specifying a Schema is optional, but it enables type hints on
  // finds and inserts
  await users.createIndex({ id: 1 }, { unique: true });
  await users.createIndex({ email: 2 });
  await users.createIndex({ 'verification.data': 3 });

  const result = await users.insertOne(user);
  console.log(`A document was inserted with the _id: ${result.insertedId}`);
  return result;
};

type EmailOrId = Partial<Pick<User, 'id' | 'email'>>;

const byIdOrEmail = ({ id, email }: EmailOrId) => ({
  ...(id ? { id } : {}),
  ...(email ? { email } : {}),
});

export const doesUserExist = async (user: EmailOrId) =>
  (await users.findOne(byIdOrEmail(user))) !== null;

const convertUser = (user: User | null): User => {
  if (!user) {
    throw new Error('User not found');
  }

  return {
    ...user,
    devices: user.devices.map((device) => ({
      ...device,
      credentialPublicKey: convertMongoDbBinaryToBuffer(device.credentialPublicKey),
      credentialID: convertMongoDbBinaryToBuffer(device.credentialID),
    })),
  };
};

export const get = async (user: EmailOrId, { requireEmailValidated = true } = {}) => {
  const convertedUser = convertUser(await users.findOne({ ...byIdOrEmail(user) }));

  if (requireEmailValidated && convertedUser?.verification.validated === false) {
    throw new Error('Account not verified');
  }

  return convertedUser;
};

export const validateEmailCode = async (code: string) => {
  const now = Date.now();
  const updated = await users.findOneAndUpdate(
    { 'verification.data': code, 'verification.validUntil': { $gt: now } },
    { $set: { 'verification.validated': true, 'verification.validUntil': now } }
  );

  if (!updated.lastErrorObject?.updatedExisting) {
    throw new Error('Verification code not found');
  }

  return updated.value;
};

export const getForChallenge = async (user: EmailOrId, requireEmailValidated = true) => {
  const convertedUser = convertUser(
    await users.findOne({
      ...byIdOrEmail(user),
      'challenge.validUntil': { $gt: Date.now() },
    })
  );

  if (requireEmailValidated && convertedUser?.verification.validated === false) {
    throw new Error('Account not verified');
  }

  return convertedUser;
};

export const replace = async (user: EmailOrId, update: User) =>
  users.findOneAndReplace(byIdOrEmail(user), update);

export const updateDevice = async (user: EmailOrId, device: AuthenticatorDevice) =>
  users.findOneAndUpdate(
    { ...byIdOrEmail(user), 'devices.credentialID': device.credentialID },
    {
      $set: {
        'devices.$': device,
      },
    }
  );

export const removeDevice = async (user: EmailOrId, deviceIndex: number) => {
  const userToUpdate = await get(user);
  userToUpdate.devices.splice(deviceIndex, 1);

  await replace(user, userToUpdate);
  return userToUpdate;
};

export const remove = async (user: EmailOrId) => users.findOneAndDelete(byIdOrEmail(user));
