import userAgentPlatform from 'platform';
import { createTransport } from 'nodemailer';

import { config } from '../config.js';

export const getWebAuthnValidUntil = () => Date.now() + config.webAuthnOptions.timeout;

export const getTenMinutesFromNow = () => Date.now() + 600000;

export const getCredentialNameFromPlatform = (userAgent?: string) => {
  const { name, product, os } = userAgentPlatform.parse(userAgent);
  return [name, product, os?.family].filter(Boolean).join(' ');
};

export const sendVerificationEmail = async (email: string, code: string, addCredential = false) => {
  const verificationUrl = `${config.webUrl}/validateEmail.html?code=${code}${
    addCredential ? '&registerCredential' : ''
  }`;

  const message = `To ${addCredential ? 'login to' : 'complete your registration on'} ${
    config.webAuthnOptions.rpName
  } please click the following link

  ${verificationUrl}

DO NOT share this link with anyone else, if you do they can take over your account.`;

  const logEmail = () => {
    console.log('----------------SMTP_HOST not set----------------');
    console.log('Email verification link would have been sent to:');
    console.log(email);
    console.log(message);
    console.log('-------------------------------------------------');
  };

  if (!process.env.SMTP_HOST) {
    logEmail();
  } else {
    try {
      const transporter = createTransport({
        host: process.env.SMTP_HOST,
        port: 465,
        auth: {
          user: process.env.SMTP_USERNAME || process.env.SMTP_FROM,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `${config.webAuthnOptions.rpName} <${process.env.SMTP_FROM}>`,
        to: email,
        subject: `${config.webAuthnOptions.rpName} ${addCredential ? 'login' : 'registration'}`,
        text: message,
      });
    } catch (err) {
      logEmail();
      console.error('Error sending verification email', err);
    }
  }
};
