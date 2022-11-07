import { parse as parseUserAgent } from 'platform';

export const getDeviceNameFromPlatform = (userAgent?: string) => {
  const { name, product, os } = parseUserAgent(userAgent);
  return [name, product, os?.family].filter(Boolean).join(' ');
};
