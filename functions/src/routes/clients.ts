import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { validateClient } from '../middleware/validateClient';
import { CreateClientDto } from '../models/client.model';

export const clientsRouter = Router();
const COLLECTION = 'clients';

// GET /clients — listar solo los del usuario autenticado
clientsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const uid = req.user!.uid;
    const snap = await db.collection(COLLECTION)
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();
    const clients = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(clients);
  } catch (err: any) {
    console.error('[GET /clients]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /clients/:id — obtener uno (solo si pertenece al usuario)
clientsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const uid = req.user!.uid;
    const docRef = db.collection(COLLECTION).doc(req.params['id']);
    const snap = await docRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }
    if (snap.data()!['userId'] !== uid) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }
    res.json({ id: snap.id, ...snap.data() });
  } catch (err: any) {
    console.error('[GET /clients/:id]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /clients — crear (inyecta userId del token)
clientsRouter.post('/', validateClient, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const uid = req.user!.uid;
    const payload: CreateClientDto = req.body;
    const docRef = await db.collection(COLLECTION).add({
      ...payload,
      userId: uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const created = await docRef.get();
    res.status(201).json({ id: docRef.id, ...created.data() });
  } catch (err: any) {
    console.error('[POST /clients]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /clients/:id — actualizar (solo si pertenece al usuario)
clientsRouter.put('/:id', validateClient, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const uid = req.user!.uid;
    const docRef = db.collection(COLLECTION).doc(req.params['id']);
    const snap = await docRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }
    if (snap.data()!['userId'] !== uid) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }
    const { userId: _strip, ...payload }: Partial<CreateClientDto> = req.body;
    await docRef.update({
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const updated = await docRef.get();
    res.json({ id: docRef.id, ...updated.data() });
  } catch (err: any) {
    console.error('[PUT /clients/:id]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /clients/:id — eliminar (solo si pertenece al usuario)
clientsRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const uid = req.user!.uid;
    const docRef = db.collection(COLLECTION).doc(req.params['id']);
    const snap = await docRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }
    if (snap.data()!['userId'] !== uid) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }
    await docRef.delete();
    res.status(204).send();
  } catch (err: any) {
    console.error('[DELETE /clients/:id]', err);
    res.status(500).json({ error: err.message });
  }
});
