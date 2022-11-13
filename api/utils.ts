import { parse as parseUserAgent } from 'platform';
import { createTransport } from 'nodemailer';

import { config } from './config';

export const getWebAuthnValidUntil = () => Date.now() + config.webAuthnOptions.timeout;

export const getTenMinutesFromNow = () => Date.now() + 600000;

export const getDeviceNameFromPlatform = (userAgent?: string) => {
  const { name, product, os } = parseUserAgent(userAgent);
  return [name, product, os?.family].filter(Boolean).join(' ');
};

export const sendVerificationEmail = async (email: string, code: string, addDevice = false) => {
  const verificationUrl = `${config.webUrl}/validateEmail.html?code=${code}${addDevice ? '&registerDevice' : ''}`;

  const message = `To ${addDevice ? 'login to' : 'complete your registration on'} ${
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
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `${config.webAuthnOptions.rpName} <${process.env.SMTP_EMAIL}>`,
        to: email,
        subject: `${config.webAuthnOptions.rpName} ${addDevice ? 'login' : 'registration'}`,
        text: message,
      });
    } catch (err) {
      logEmail();
      console.error('Error sending verification email', err);
    }
  }
};
