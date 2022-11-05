import { MongoClient } from 'mongodb';
import { config } from '../config';

// Replace the uri string with your MongoDB deployment's connection string.
const uri = `${process.env.ME_CONFIG_MONGODB_URL}`;

const client = new MongoClient(uri);
export const database = client.db('webAuthn');

export const convertMongoDbBinaryToBuffer = (mongoDbBinary: any) =>
  Buffer.from(mongoDbBinary.toString('base64'), 'base64');

export const getWebAuthnValidUntil = () => Date.now() + config.webAuthnOptions.timeout;

export const close = async () => client.close;
