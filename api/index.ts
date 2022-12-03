import http from 'http';

import express, { Response } from 'express';
import cors from 'cors';
import { expressjwt, Request as RequestJwt } from 'express-jwt';
import { v4 as uuidv4 } from 'uuid';
import cookieParser from 'cookie-parser';

import { asyncHandler, errorHandler } from './handlers';
import { registrationGenerateOptions, registrationVerify } from './register';
import { authenticationGenerateOptions, authenticationVerify } from './login';
import { config } from './config';
import {
  addDeviceGenerateOptions,
  addDeviceVerify,
  deleteAccount,
  deleteDevice,
  emailVerify,
  getAccount,
  renameDevice,
  sendValidationEmail,
  updateAccount,
} from './account';
import { getDeviceNameFromPlatform } from './utils';

export const JWT_SECRET = process.env.JWT_SECRET || uuidv4();

const app = express();
app.use(cors({ origin: config.webUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get(
  '/',
  asyncHandler(async (req, res) => {
    res.send({ status: 'ok' });
  })
);

app.post(
  '/registration/generate-options',
  asyncHandler(async (req, res) => {
    res.send(await registrationGenerateOptions(req.body));
  })
);

app.post(
  '/registration/verify',
  asyncHandler(async (req, res) => {
    res.send(
      await registrationVerify(req.body, getDeviceNameFromPlatform(req.headers['user-agent']))
    );
  })
);

app.post(
  '/email/send/validation',
  asyncHandler(async (req, res) => {
    res.send(await sendValidationEmail(req.body));
  })
);

app.post(
  '/email/validate',
  asyncHandler(async (req, res) => {
    const updatedUser = await emailVerify(req.body.code);
    setLoginJwtCookie(res, updatedUser.jwtToken);
    res.send(updatedUser);
  })
);

app.post(
  '/authentication/generate-options',
  asyncHandler(async (req, res) => {
    res.send(await authenticationGenerateOptions(req.body));
  })
);

const setLoginJwtCookie = (res: Response, jwtToken: string) => {
  res.cookie('jwt', jwtToken, {
    secure: config.apiUrl.startsWith('https'),
    expires: new Date(Date.now() + 24 * 3600000),
  });
};

app.post(
  '/authentication/verify',
  asyncHandler(async (req, res) => {
    const authRes = await authenticationVerify(req.body);
    setLoginJwtCookie(res, authRes.jwtToken);
    res.send(authRes);
  })
);

app.use(
  '/account',
  expressjwt({
    secret: JWT_SECRET,
    algorithms: ['HS256'],
    credentialsRequired: true,
    getToken: (req) => req.cookies?.['jwt'] || null,
  })
);

app.get(
  '/account',
  asyncHandler(async (req: RequestJwt<any>, res) => {
    res.send(await getAccount(req.auth));
  })
);

app.post(
  '/account',
  asyncHandler(async (req: RequestJwt<any>, res) => {
    const updatedUser = await updateAccount(req.auth, req.body);
    setLoginJwtCookie(res, updatedUser.jwtToken);
    res.send(updatedUser);
  })
);

app.post(
  '/account/add-device/generate-options',
  asyncHandler(async (req: RequestJwt<any>, res) => {
    res.send(await addDeviceGenerateOptions(req.auth));
  })
);

app.post(
  '/account/add-device/verify',
  asyncHandler(async (req: RequestJwt<any>, res) => {
    const updatedUser = await addDeviceVerify(
      req.auth,
      req.body.credential,
      req.body.deviceName || getDeviceNameFromPlatform(req.headers['user-agent'])
    );
    setLoginJwtCookie(res, updatedUser.jwtToken);
    res.send({ verified: Boolean(updatedUser.jwtToken) });
  })
);

app.post(
  '/account/device/:id',
  asyncHandler(async (req: RequestJwt<any>, res) => {
    const updatedUser = await renameDevice(req.auth, req.params.id, req.body);
    setLoginJwtCookie(res, updatedUser.jwtToken);
    res.send(updatedUser);
  })
);

app.delete(
  '/account/device/:id',
  asyncHandler(async (req: RequestJwt<any>, res) => {
    const updatedUser = await deleteDevice(req.auth, req.params.id);
    setLoginJwtCookie(res, updatedUser.jwtToken);
    res.send(updatedUser);
  })
);

app.delete(
  '/account',
  asyncHandler(async (req: RequestJwt<any>, res) => {
    await deleteAccount(req.auth);
    res.clearCookie('jwt');
    res.send({ status: 'ok' });
  })
);

app.get(
  '/account/logout',
  asyncHandler(async (req, res) => {
    res.clearCookie('jwt');
    res.send({ status: 'ok' });
  })
);

app.use(errorHandler);

const host = '0.0.0.0';
const port = 4000;

http.createServer(app).listen(port, host, () => {
  console.log(`🚀 Server ready at ${host}:${port}`);
});
