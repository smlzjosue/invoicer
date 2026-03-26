import request from 'supertest';

// ── Tokens de prueba ──────────────────────────────────────────────────────────
const VALID_TOKEN = 'valid-token';
const OTHER_TOKEN = 'other-token';
const AUTH = `Bearer ${VALID_TOKEN}`;
const OTHER_AUTH = `Bearer ${OTHER_TOKEN}`;

// ── In-memory Firestore mock ──────────────────────────────────────────────────
let store: Record<string, Record<string, any>> = {};

const getDocsFiltered = (col: string, field?: string, value?: any) =>
  Object.entries(store[col] ?? {})
    .filter(([, data]) => field === undefined || data[field] === value)
    .map(([id, data]) => ({ id, data: () => data, exists: true }));

const mockDb = {
  collection: (col: string) => ({
    where: (field: string, _op: string, value: any) => ({
      orderBy: () => ({
        get: async () => ({ docs: getDocsFiltered(col, field, value) }),
      }),
      get: async () => ({ docs: getDocsFiltered(col, field, value) }),
    }),
    orderBy: () => ({
      get: async () => ({ docs: getDocsFiltered(col) }),
    }),
    add: async (data: any) => {
      const id = `mock-${Math.random().toString(36).slice(2)}`;
      store[col] = store[col] ?? {};
      store[col][id] = { ...data, createdAt: new Date(), updatedAt: new Date() };
      return {
        id,
        get: async () => ({ id, data: () => store[col][id], exists: true }),
      };
    },
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
      update: async (data: any) => {
        if (store[col]?.[id]) {
          store[col][id] = { ...store[col][id], ...data, updatedAt: new Date() };
        }
      },
      delete: async () => {
        if (store[col]) delete store[col][id];
      },
    }),
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
      if (token === OTHER_TOKEN) return { uid: 'user-2', email: 'other@test.com' };
      throw new Error('Token inválido');
    },
  }),
}));

// Import AFTER mocks
import { app } from '../src/app';

const BASE = '/invoices';

const validPayload = {
  invoiceNumber: 'INV-TEST-001',
  status: 'draft',
  issueDate: '2026-03-25',
  dueDate: '2026-04-25',
  from: { name: 'Mi Empresa', email: 'yo@empresa.com', address: 'Calle 1' },
  to: { name: 'Cliente S.A.', email: 'cliente@empresa.com', address: 'Av. 2' },
  items: [{ description: 'Servicio', quantity: 1, rate: 100, amount: 100 }],
  notes: '',
  subtotal: 100,
  taxRate: 0,
  taxAmount: 0,
  total: 100,
};

beforeEach(() => { store = {}; });

// ── Auth ───────────────────────────────────────────────────────────────────────

describe('Auth — sin token', () => {
  it('retorna 401 en GET /invoices sin Authorization', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it('retorna 401 en POST /invoices sin Authorization', async () => {
    const res = await request(app).post(BASE).send(validPayload);
    expect(res.status).toBe(401);
  });
});

// ── GET /invoices ─────────────────────────────────────────────────────────────

describe('GET /invoices', () => {
  it('retorna array vacío cuando no hay facturas', async () => {
    const res = await request(app).get(BASE).set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('retorna solo las facturas del usuario autenticado', async () => {
    await request(app).post(BASE).set('Authorization', AUTH).send(validPayload);
    await request(app).post(BASE).set('Authorization', OTHER_AUTH).send({ ...validPayload, invoiceNumber: 'INV-002' });

    const res = await request(app).get(BASE).set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].invoiceNumber).toBe('INV-TEST-001');
  });
});

// ── POST /invoices ────────────────────────────────────────────────────────────

describe('POST /invoices', () => {
  it('crea una factura y retorna 201 con ID', async () => {
    const res = await request(app).post(BASE).set('Authorization', AUTH).send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.invoiceNumber).toBe('INV-TEST-001');
    expect(res.body.userId).toBe('user-1');
  });

  it('retorna 400 si falta invoiceNumber', async () => {
    const { invoiceNumber: _omit, ...invalid } = validPayload;
    const res = await request(app).post(BASE).set('Authorization', AUTH).send(invalid);
    expect(res.status).toBe(400);
    expect(res.body.details).toContain('invoiceNumber es requerido');
  });

  it('retorna 400 si items está vacío', async () => {
    const res = await request(app).post(BASE).set('Authorization', AUTH).send({ ...validPayload, items: [] });
    expect(res.status).toBe(400);
  });

  it('retorna 400 si status es inválido', async () => {
    const res = await request(app).post(BASE).set('Authorization', AUTH).send({ ...validPayload, status: 'unknown' });
    expect(res.status).toBe(400);
  });
});

// ── GET /invoices/:id ─────────────────────────────────────────────────────────

describe('GET /invoices/:id', () => {
  it('retorna la factura por ID', async () => {
    const created = await request(app).post(BASE).set('Authorization', AUTH).send(validPayload);
    const id = created.body.id;
    const res = await request(app).get(`${BASE}/${id}`).set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it('retorna 404 si no existe', async () => {
    const res = await request(app).get(`${BASE}/id-inexistente`).set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });

  it('retorna 403 si la factura pertenece a otro usuario', async () => {
    const created = await request(app).post(BASE).set('Authorization', AUTH).send(validPayload);
    const id = created.body.id;
    const res = await request(app).get(`${BASE}/${id}`).set('Authorization', OTHER_AUTH);
    expect(res.status).toBe(403);
  });
});

// ── PUT /invoices/:id ─────────────────────────────────────────────────────────

describe('PUT /invoices/:id', () => {
  it('actualiza la factura y retorna 200', async () => {
    const created = await request(app).post(BASE).set('Authorization', AUTH).send(validPayload);
    const id = created.body.id;
    const res = await request(app).put(`${BASE}/${id}`).set('Authorization', AUTH).send({ ...validPayload, status: 'paid' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('paid');
  });

  it('retorna 404 si el ID no existe', async () => {
    const res = await request(app).put(`${BASE}/id-inexistente`).set('Authorization', AUTH).send(validPayload);
    expect(res.status).toBe(404);
  });

  it('retorna 403 si la factura pertenece a otro usuario', async () => {
    const created = await request(app).post(BASE).set('Authorization', AUTH).send(validPayload);
    const id = created.body.id;
    const res = await request(app).put(`${BASE}/${id}`).set('Authorization', OTHER_AUTH).send({ ...validPayload, status: 'paid' });
    expect(res.status).toBe(403);
  });
});

// ── DELETE /invoices/:id ──────────────────────────────────────────────────────

describe('DELETE /invoices/:id', () => {
  it('elimina la factura y retorna 204', async () => {
    const created = await request(app).post(BASE).set('Authorization', AUTH).send(validPayload);
    const id = created.body.id;
    const delRes = await request(app).delete(`${BASE}/${id}`).set('Authorization', AUTH);
    expect(delRes.status).toBe(204);
    const check = await request(app).get(`${BASE}/${id}`).set('Authorization', AUTH);
    expect(check.status).toBe(404);
  });

  it('retorna 404 si el ID no existe', async () => {
    const res = await request(app).delete(`${BASE}/id-inexistente`).set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });

  it('retorna 403 si la factura pertenece a otro usuario', async () => {
    const created = await request(app).post(BASE).set('Authorization', AUTH).send(validPayload);
    const id = created.body.id;
    const res = await request(app).delete(`${BASE}/${id}`).set('Authorization', OTHER_AUTH);
    expect(res.status).toBe(403);
  });
});
