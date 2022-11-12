import { database } from './index';
import { getWebAuthnValidUntil } from '../utils';

export interface AnonymousChallenges {
  validUntil: number;
  challenge: string;
}

const anonymousChallenges = database.collection<AnonymousChallenges>('anonymousChallenges');

export const save = async (challenge: AnonymousChallenges['challenge']) => {
  // Specifying a Schema is optional, but it enables type hints on
  // finds and inserts
  await anonymousChallenges.createIndex({ challenge: 1 });

  return anonymousChallenges.insertOne({
    validUntil: getWebAuthnValidUntil(),
    challenge,
  });
};

export const exists = async (challenge: AnonymousChallenges['challenge']) =>
  anonymousChallenges.findOne({ validUntil: { $gt: Date.now() }, challenge });

export const deleteOld = async () => {
  anonymousChallenges.deleteMany({ validUntil: { $lt: Date.now() } });
};
