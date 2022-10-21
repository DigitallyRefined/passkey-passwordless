import http from 'http';

import express from 'express';

import { config } from './config';

const app = express();

const host = '0.0.0.0';
const port = 4000;

http.createServer(app).listen(port, host, () => {
  console.log(`🚀 Server ready at ${host}:${port}`);
});
