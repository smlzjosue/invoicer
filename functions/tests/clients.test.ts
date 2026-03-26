import request from 'supertest';
import * as dbHandler from './db-handler';

// ── Tokens de prueba ──────────────────────────────────────────────────────────
const VALID_TOKEN = 'valid-token';
const OTHER_TOKEN = 'other-token';
const AUTH = `Bearer ${VALID_TOKEN}`;
const OTHER_AUTH = `Bearer ${OTHER_TOKEN}`;

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

const BASE = '/clients';

const validPayload = {
  name: 'Acme Corp',
  email: 'contacto@acme.com',
  phone: '+52 55 1234 5678',
  address: 'Av. Insurgentes 123, CDMX',
};

beforeAll(() => dbHandler.connect());
afterAll(() => dbHandler.closeDatabase());
beforeEach(() => dbHandler.clearDatabase());

// ── Auth ───────────────────────────────────────────────────────────────────────

describe('Auth — sin token', () => {
  it('retorna 401 en GET /clients sin Authorization', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it('retorna 401 en POST /clients sin Authorization', async () => {
    const res = await request(app).post(BASE).send(validPayload);
    expect(res.status).toBe(401);
  });
});

// ── GET /clients ──────────────────────────────────────────────────────────────

describe('GET /clients', () => {
  it('retorna array vacío cuando no hay clientes', async () => {
    const res = await request(app).get(BASE).set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('retorna solo los clientes del usuario autenticado', async () => {
    await request(app).post(BASE).set('Authorization', AUTH).send(validPayload);
    await request(app).post(BASE).set('Authorization', OTHER_AUTH).send({ ...validPayload, name: 'Otro Corp' });

    const res = await request(app).get(BASE).set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Acme Corp');
  });
});

// ── POST /clients ─────────────────────────────────────────────────────────────

describe('POST /clients', () => {
  it('crea un cliente y retorna 201 con ID', async () => {
    const res = await request(app).post(BASE).set('Authorization', AUTH).send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Acme Corp');
    expect(res.body.userId).toBe('user-1');
  });

  it('retorna 400 si falta name', async () => {
    const { name: _omit, ...invalid } = validPayload;
    const res = await request(app).post(BASE).set('Authorization', AUTH).send(invalid);
    expect(res.status).toBe(400);
    expect(res.body.details).toContain('name es requerido');
  });

  it('retorna 400 si falta email', async () => {
    const { email: _omit, ...invalid } = validPayload;
    const res = await request(app).post(BASE).set('Authorization', AUTH).send(invalid);
    expect(res.status).toBe(400);
    expect(res.body.details).toContain('email es requerido');
  });

  it('acepta phone vacío (campo opcional en contenido)', async () => {
    const res = await request(app).post(BASE).set('Authorization', AUTH).send({ ...validPayload, phone: '' });
    expect(res.status).toBe(201);
  });
});

// ── GET /clients/:id ──────────────────────────────────────────────────────────

describe('GET /clients/:id', () => {
  it('retorna el cliente por ID', async () => {
    const created = await request(app).post(BASE).set('Authorization', AUTH).send(validPayload);
    const id = created.body.id;
    const res = await request(app).get(`${BASE}/${id}`).set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.name).toBe('Acme Corp');
  });

  it('retorna 404 si no existe', async () => {
    const res = await request(app).get(`${BASE}/000000000000000000000000`).set('Authorization', AUTH);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Cliente no encontrado');
  });

  it('retorna 403 si el cliente pertenece a otro usuario', async () => {
    const created = await request(app).post(BASE).set('Authorization', AUTH).send(validPayload);
    const id = created.body.id;
    const res = await request(app).get(`${BASE}/${id}`).set('Authorization', OTHER_AUTH);
    expect(res.status).toBe(403);
  });
});

// ── PUT /clients/:id ──────────────────────────────────────────────────────────

describe('PUT /clients/:id', () => {
  it('actualiza el cliente y retorna 200', async () => {
    const created = await request(app).post(BASE).set('Authorization', AUTH).send(validPayload);
    const id = created.body.id;
    const res = await request(app).put(`${BASE}/${id}`).set('Authorization', AUTH).send({ ...validPayload, name: 'Acme Actualizado' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Acme Actualizado');
  });

  it('retorna 404 si el ID no existe', async () => {
    const res = await request(app).put(`${BASE}/000000000000000000000000`).set('Authorization', AUTH).send(validPayload);
    expect(res.status).toBe(404);
  });

  it('retorna 403 si el cliente pertenece a otro usuario', async () => {
    const created = await request(app).post(BASE).set('Authorization', AUTH).send(validPayload);
    const id = created.body.id;
    const res = await request(app).put(`${BASE}/${id}`).set('Authorization', OTHER_AUTH).send({ ...validPayload, name: 'Hack' });
    expect(res.status).toBe(403);
  });
});

// ── DELETE /clients/:id ───────────────────────────────────────────────────────

describe('DELETE /clients/:id', () => {
  it('elimina el cliente y retorna 204', async () => {
    const created = await request(app).post(BASE).set('Authorization', AUTH).send(validPayload);
    const id = created.body.id;
    const delRes = await request(app).delete(`${BASE}/${id}`).set('Authorization', AUTH);
    expect(delRes.status).toBe(204);
    const check = await request(app).get(`${BASE}/${id}`).set('Authorization', AUTH);
    expect(check.status).toBe(404);
  });

  it('retorna 404 si el ID no existe', async () => {
    const res = await request(app).delete(`${BASE}/000000000000000000000000`).set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });

  it('retorna 403 si el cliente pertenece a otro usuario', async () => {
    const created = await request(app).post(BASE).set('Authorization', AUTH).send(validPayload);
    const id = created.body.id;
    const res = await request(app).delete(`${BASE}/${id}`).set('Authorization', OTHER_AUTH);
    expect(res.status).toBe(403);
  });
});
