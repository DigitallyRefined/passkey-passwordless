import { generateRegistrationOptions } from '@simplewebauthn/server';

export const config: Config = {
  webUrl: `${process.env.WEB_URL}`,
  apiUrl: `${process.env.API_URL}`,
  webAuthnOptions: {
    /**
     * Domain or hostname
     *
     * RP ID represents the "scope" of websites on which a authenticator should be usable. The Origin
     * represents the expected URL from which registration or authentication occurs.
     * Only `localhost` and FQDNs that match the current domain are valid.
     */
    rpID: `${process.env.WEB_HOSTNAME}`,
    rpName: 'Passkey Example',
    timeout: 150000,
    /**
     * Restrict allowed devices/manufactures
     * "none" is the recommended setting to allow users to use different platforms & security key manufactures
     *
     * "direct" wants to receive the attestation statement
     * "enterprise" wants to receive the attestation statement and wants to know the identity of the authenticator
     * "none" not interested in authenticator attestation
     */
    attestationType: 'none',
    /**
     * Restrict types of authentication
     *
     * undefined don't restrict types of authentication
     * "platform" only allow system biometrics (e.g. face unlock, fingerprint or PIN)
     * "cross-platform" only allow physical security keys etc.
     */
    authenticatorAttachment: undefined,
    /**
     * If we should store their email/username in the system keystore or on their security key upon registration
     * Note some physical security keys may only have a total of 25 slots for saving usernames/private keys
     */
    residentKey: 'preferred',
    /**
     * Prompt the user to verify the WebAuthn request
     * E.g. via on-screen (system UI) or by pressing a button on their key
     */
    userVerification: 'preferred',
  },
};

interface Config {
  webUrl: string;
  apiUrl: string;
  webAuthnOptions: {
    rpID: string;
    rpName: string;
    timeout: number;
    attestationType?: Parameters<typeof generateRegistrationOptions>[0]['attestationType'];
    authenticatorAttachment?: AuthenticatorAttachment;
    residentKey?: ResidentKeyRequirement;
    userVerification?: UserVerificationRequirement;
  };
}
