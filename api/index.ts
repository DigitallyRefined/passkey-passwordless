import http from 'http';

import express from 'express';
import cors from 'cors';

import { asyncHandler, errorHandler } from './handlers';
import { register } from './db/register';
import { registrationGenerateOptions, registrationVerify } from './register';
import { authenticationGenerateOptions, authenticationVerify } from './login';

const app = express();
app.use(cors());
app.use(express.json());

app.post(
  '/',
  asyncHandler(async (req, res) => {
    res.send(await register(req.body));
  })
);

app.post(
  '/registration/generate-options',
  asyncHandler(async (req, res) => {
    res.send(registrationGenerateOptions(req.body));
  })
);

app.post(
  '/registration/verify',
  asyncHandler(async (req, res) => {
    res.send(await registrationVerify(req.body));
  })
);

app.post(
  '/authentication/generate-options',
  asyncHandler(async (req, res) => {
    res.send(authenticationGenerateOptions(req.body));
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
