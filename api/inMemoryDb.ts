import type { AuthenticatorDevice } from '@simplewebauthn/typescript-types';

interface LoggedInUser {
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
  username: string;
  devices: AuthenticatorDevice[];
  currentChallenge?: string;
}

export const inMemoryUserDeviceDB: { [loggedInUserId: string]: LoggedInUser } = {};

export const inMemoryChallenges: string[] = [];
