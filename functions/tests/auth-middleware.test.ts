import request from 'supertest';

// ── Firestore mock mínimo ────────────────────────────────────────────────────
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: () => ({}) }),
  FieldValue: { serverTimestamp: () => new Date() },
}));

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  getApps: () => [{}],
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async (token: string) => {
      if (token === 'valid-token') return { uid: 'user-1', email: 'test@test.com' };
      throw new Error('Token inválido');
    },
  }),
}));

import { app } from '../src/app';

describe('Auth Middleware', () => {
  it('retorna 401 cuando no hay header Authorization', async () => {
    const res = await request(app).get('/invoices');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/token requerido/i);
  });

  it('retorna 401 cuando el token es inválido', async () => {
    const res = await request(app).get('/invoices').set('Authorization', 'Bearer token-invalido');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/token inválido/i);
  });

  it('retorna 401 cuando el header no tiene formato Bearer', async () => {
    const res = await request(app).get('/invoices').set('Authorization', 'Basic abc123');
    expect(res.status).toBe(401);
  });

  it('/health es público y no requiere token', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
