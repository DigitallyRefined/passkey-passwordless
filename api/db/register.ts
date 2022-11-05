import { database, dbActionToRes } from './index';

export interface User {
  email: string;
  webauthn?: string;
}

const onRegister = async (user: User) => {
  try {
    // Specifying a Schema is optional, but it enables type hints on
    // finds and inserts
    const users = database.collection<User>('users');
    await users.createIndex({ id: 1, email: 2 }, { unique: true });

    const result = await users.insertOne(user);
    console.log(`A document was inserted with the _id: ${result.insertedId}`);

    return 'USER_ADDED';
  } catch (e) {
    if (e instanceof Error && e.message.includes('duplicate')) {
      throw new Error('USER_ALREADY_EXISTS');
    }
    throw e;
  }
};

export const register = async (user: User) => dbActionToRes<User>(onRegister, user);
