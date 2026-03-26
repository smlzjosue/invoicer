import * as dotenv from 'dotenv';
import * as path from 'path';

const envFile = `.env.${process.env['APP_ENV'] ?? 'dev'}`;
dotenv.config({ path: path.resolve(__dirname, '../', envFile) });

import { initializeApp } from 'firebase-admin/app';
import { app } from './app';

initializeApp();

const PORT = process.env['PORT'] ?? 5000;
app.listen(PORT, () => {
  console.log(`[server] API corriendo en http://localhost:${PORT}`);
  console.log(`[server] Env: ${process.env['APP_ENV'] ?? 'dev'}`);
});
