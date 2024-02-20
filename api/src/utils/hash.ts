// @see https://stackoverflow.com/a/45652825
import * as crypto from 'crypto';

const KEY_LENGTH = 256;
const SALT_LENGTH = 64;
const ITERATIONS = 10000;
const DIGEST = 'sha512';
const BYTE_TO_STRING_ENCODING = 'hex'; // this could be base64, for instance

/**
 * The information about the passphrase that is stored in the database
 */
export interface PersistedPassphrase {
  salt: string;
  hash: string;
  iterations: number;
}

/**
 * Generates a PersistedPassphrase given the passphrase provided by the user. This should be called when creating a user
 * or redefining the passphrase
 */
export const generateHashedPassphrase = async (passphrase: string): Promise<PersistedPassphrase> =>
  new Promise<PersistedPassphrase>((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH).toString(BYTE_TO_STRING_ENCODING);
    crypto.pbkdf2(passphrase, salt, ITERATIONS, KEY_LENGTH, DIGEST, (error, hash) => {
      if (error) {
        reject(error);
      } else {
        resolve({
          salt,
          hash: hash.toString(BYTE_TO_STRING_ENCODING),
          iterations: ITERATIONS,
        });
      }
    });
  });

/**
 * Verifies the attempted passphrase against the passphrase information saved in the database. This should be called when
 * the user tries to log in.
 */
export const verifyPassphrase = async (
  persistedPassphrase: PersistedPassphrase,
  passphraseAttempt: string
): Promise<boolean> =>
  new Promise<boolean>((resolve, reject) => {
    crypto.pbkdf2(
      passphraseAttempt,
      persistedPassphrase.salt,
      persistedPassphrase.iterations,
      KEY_LENGTH,
      DIGEST,
      (error, hash) => {
        if (error) {
          reject(error);
        } else {
          resolve(persistedPassphrase.hash === hash.toString(BYTE_TO_STRING_ENCODING));
        }
      }
    );
  });
