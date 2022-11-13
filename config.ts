const hostname = 'localhost';

export const config: Config = {
  webUrl: `http://${hostname}:3000`,
  apiUrl: `http://${hostname}:4000`,
  webAuthnOptions: {
    /**
     * Domain or hostname
     *
     * RP ID represents the "scope" of websites on which a authenticator should be usable. The Origin
     * represents the expected URL from which registration or authentication occurs.
     * Only `localhost` and FQDNs that match the current domain are valid.
     */
    rpID: hostname,
    rpName: 'WebAuthn Passwordless Example',
    timeout: 60000,
    /**
     * Restrict allowed devices/manufactures
     * "none" is the recommended setting to allow users to use different platforms & security key manufactures
     *
     * "direct" wants to receive the attestation statement
     * "indirect" prefers a verifiable attestation statement but allows the client to decide how to obtain it
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
    attestationType?: AttestationConveyancePreference;
    authenticatorAttachment?: AuthenticatorAttachment;
    residentKey?: ResidentKeyRequirement;
    userVerification?: UserVerificationRequirement;
  };
}
