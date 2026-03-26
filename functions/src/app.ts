import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDb } from './db/connection';
import { authMiddleware } from './middleware/auth';
import { invoicesRouter } from './routes/invoices';
import { clientsRouter } from './routes/clients';
import { profileRouter } from './routes/profile';

const app = express();

const allowedOrigins: string[] = (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:8100')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origen no permitido — ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Conectar a MongoDB (cached — no-op si ya está conectado)
app.use(async (_req, res, next) => {
  try { await connectDb(); next(); }
  catch (err: any) { res.status(500).json({ error: 'Error de conexión a la base de datos' }); }
});

// Health check — público, sin auth
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    env: process.env['APP_ENV'] ?? 'unknown',
    dbStatus: mongoose.connection.readyState, // 0=disconnected 1=connected 2=connecting
    mongoUriSet: !!process.env['MONGO_URI'],
    timestamp: new Date().toISOString(),
  });
});

// Todas las rutas de negocio requieren token válido
app.use(authMiddleware);

app.use('/invoices', invoicesRouter);
app.use('/clients', clientsRouter);
app.use('/profile', profileRouter);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Error]', err.message);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

export { app };
