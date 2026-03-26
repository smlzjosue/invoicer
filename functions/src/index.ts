import * as dotenv from 'dotenv';
import * as path from 'path';

// Carga .env.dev / .env.prod según APP_ENV; en Cloud Functions las vars ya vienen del runtime
const envFile = `.env.${process.env['APP_ENV'] ?? 'dev'}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

import { initializeApp } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';
import { app } from './app';

initializeApp();

export const api = onRequest(
  {
    region: 'us-central1',
    cors: true,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  app
);
