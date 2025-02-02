import './node_modules/@simplewebauthn/browser/dist/bundle/index.umd.min.js';

import type {
  browserSupportsWebAuthn as BrowserSupportsWebAuthn,
  startAuthentication as StartAuthentication,
  startRegistration as StartRegistration,
  browserSupportsWebAuthnAutofill as BrowserSupportsWebAuthnAutofill,
} from '@simplewebauthn/browser';

type SimpleWebAuthnBrowser = {
  browserSupportsWebAuthn: typeof BrowserSupportsWebAuthn;
  startAuthentication: typeof StartAuthentication;
  startRegistration: typeof StartRegistration;
  browserSupportsWebAuthnAutofill: typeof BrowserSupportsWebAuthnAutofill;
};

export const {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  browserSupportsWebAuthnAutofill,
  // @ts-ignore
} = window.SimpleWebAuthnBrowser as SimpleWebAuthnBrowser;
