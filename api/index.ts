import http from 'http';

import express from 'express';
import cors from 'cors';
import { parse as parseUserAgent } from 'platform';

import { asyncHandler, errorHandler } from './handlers';
import { registrationGenerateOptions, registrationVerify } from './register';
import { authenticationGenerateOptions, authenticationVerify } from './login';

const app = express();
app.use(cors());
app.use(express.json());

app.get(
  '/',
  asyncHandler(async (req, res) => {
    res.send('ok');
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
    const platform = parseUserAgent(req.headers['user-agent']);
    res.send(await registrationVerify(req.body, platform));
  })
);

app.post(
  '/authentication/generate-options',
  asyncHandler(async (req, res) => {
    res.send(await authenticationGenerateOptions(req.body));
  })
);

app.post(
  '/authentication/verify',
  asyncHandler(async (req, res) => {
    res.send(await authenticationVerify(req.body));
  })
);

app.use(errorHandler);

const host = '0.0.0.0';
const port = 4000;

http.createServer(app).listen(port, host, () => {
  console.log(`🚀 Server ready at ${host}:${port}`);
});
