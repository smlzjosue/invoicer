import request from 'supertest';

const VALID_TOKEN = 'valid-token';
const AUTH = `Bearer ${VALID_TOKEN}`;

// ── In-memory Firestore mock ──────────────────────────────────────────────────
let store: Record<string, Record<string, any>> = {};

const mockDb = {
  collection: (col: string) => ({
    where: (_f: string, _op: string, _v: any) => ({
      orderBy: () => ({ get: async () => ({ docs: [] }) }),
      get: async () => ({ docs: [] }),
    }),
    orderBy: () => ({ get: async () => ({ docs: [] }) }),
    doc: (id: string) => ({
      get: async () => ({
        id,
        exists: !!(store[col] ?? {})[id],
        data: () => (store[col] ?? {})[id],
      }),
      set: async (data: any, opts?: { merge?: boolean }) => {
        store[col] = store[col] ?? {};
        store[col][id] = opts?.merge && store[col][id]
          ? { ...store[col][id], ...data }
          : { ...data };
      },
      update: async () => {},
      delete: async () => {},
    }),
    add: async () => ({ id: 'mock-id', get: async () => ({ id: 'mock-id', data: () => ({}), exists: true }) }),
  }),
};

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
  FieldValue: { serverTimestamp: () => new Date() },
}));

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  getApps: () => [{}],
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async (token: string) => {
      if (token === VALID_TOKEN) return { uid: 'user-1', email: 'test@test.com' };
      throw new Error('Token inválido');
    },
  }),
}));

import { app } from '../src/app';

const BASE = '/profile';
const validProfile = {
  companyName: 'Mi Empresa S.A.',
  email: 'yo@empresa.com',
  phone: '+52 55 0000 0000',
  address: 'Calle Falsa 123',
};

beforeEach(() => { store = {}; });

describe('GET /profile', () => {
  it('retorna 404 cuando el perfil no existe aún', async () => {
    const res = await request(app).get(BASE).set('Authorization', AUTH);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Perfil no encontrado');
  });

  it('retorna el perfil existente', async () => {
    await request(app).put(BASE).set('Authorization', AUTH).send(validProfile);
    const res = await request(app).get(BASE).set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.companyName).toBe('Mi Empresa S.A.');
    expect(res.body.email).toBe('yo@empresa.com');
  });

  it('retorna 401 sin token', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

describe('PUT /profile', () => {
  it('crea o actualiza el perfil y retorna 200', async () => {
    const res = await request(app).put(BASE).set('Authorization', AUTH).send(validProfile);
    expect(res.status).toBe(200);
    expect(res.body.companyName).toBe('Mi Empresa S.A.');
    expect(res.body.id).toBe('user-1');
  });

  it('retorna 400 si falta companyName', async () => {
    const { companyName: _omit, ...invalid } = validProfile;
    const res = await request(app).put(BASE).set('Authorization', AUTH).send(invalid);
    expect(res.status).toBe(400);
  });

  it('retorna 400 si falta email', async () => {
    const { email: _omit, ...invalid } = validProfile;
    const res = await request(app).put(BASE).set('Authorization', AUTH).send(invalid);
    expect(res.status).toBe(400);
  });

  it('retorna 401 sin token', async () => {
    const res = await request(app).put(BASE).send(validProfile);
    expect(res.status).toBe(401);
  });
});
