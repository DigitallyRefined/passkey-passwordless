import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Replace the uri string with your MongoDB deployment's connection string.
let uri = process.env.ME_CONFIG_MONGODB_URL;
if (!uri) {
  uri = 'mongodb://127.0.0.1:27017/';

  MongoMemoryServer.create({
    instance: {
      port: 27017,
    },
  });
}

const client = new MongoClient(uri);
export const database = client.db('webAuthn');

export const convertMongoDbBinaryToBuffer = (mongoDbBinary: any) =>
  Buffer.from(mongoDbBinary.toString('base64'), 'base64');

export const close = async () => client.close;
