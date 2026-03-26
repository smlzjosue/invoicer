import * as dotenv from 'dotenv';
import * as path from 'path';

const envFile = `.env.${process.env['APP_ENV'] ?? 'dev'}`;
dotenv.config({ path: path.resolve(__dirname, '../', envFile) });

import { initializeApp } from 'firebase-admin/app';
import { app } from './app';

initializeApp({ projectId: process.env['FIREBASE_PROJECT_ID'] ?? 'invoicer-6a7c2' });

const PORT = process.env['PORT'] ?? 3000;
app.listen(PORT, () => {
  console.log(`[server] API corriendo en http://localhost:${PORT}`);
  console.log(`[server] Env: ${process.env['APP_ENV'] ?? 'dev'}`);
});
