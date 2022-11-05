import { MongoClient, ObjectId } from 'mongodb';

// Replace the uri string with your MongoDB deployment's connection string.
const uri = `${process.env.ME_CONFIG_MONGODB_URL}`;

const client = new MongoClient(uri);
export const database = client.db('webAuthn');

export const dbActionToRes = async <T>(dbAction: Function, args: T) => ({
  status: 'ok',
  code: await dbAction(args),
});

export const close = async () => client.close;
