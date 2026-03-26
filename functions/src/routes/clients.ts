import { Router, Request, Response } from 'express';
// [FIRESTORE COMENTADO] import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Client } from '../db/models/client.schema';
import { validateClient } from '../middleware/validateClient';

export const clientsRouter = Router();

// GET /clients — listar solo los del usuario autenticado
clientsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const clients = await Client.find({ userId: uid })
      .sort({ createdAt: -1 })
      .lean({ transform: (doc: any) => { doc.id = doc._id.toString(); delete doc._id; delete doc.__v; return doc; } });
    res.json(clients);
  } catch (err: any) {
    console.error('[GET /clients]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /clients/:id — obtener uno (solo si pertenece al usuario)
clientsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const doc = await Client.findById(req.params['id']);
    if (!doc) { res.status(404).json({ error: 'Cliente no encontrado' }); return; }
    if (doc.userId !== uid) { res.status(403).json({ error: 'Acceso denegado' }); return; }
    res.json(doc.toJSON());
  } catch (err: any) {
    console.error('[GET /clients/:id]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /clients — crear (inyecta userId del token)
clientsRouter.post('/', validateClient, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const { userId: _strip, ...payload } = req.body;
    const doc = await new Client({ ...payload, userId: uid }).save();
    res.status(201).json(doc.toJSON());
  } catch (err: any) {
    console.error('[POST /clients]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /clients/:id — actualizar (solo si pertenece al usuario)
clientsRouter.put('/:id', validateClient, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const existing = await Client.findById(req.params['id']);
    if (!existing) { res.status(404).json({ error: 'Cliente no encontrado' }); return; }
    if (existing.userId !== uid) { res.status(403).json({ error: 'Acceso denegado' }); return; }
    const { userId: _strip, ...payload } = req.body;
    const updated = await Client.findByIdAndUpdate(
      req.params['id'],
      { ...payload },
      { returnDocument: 'after', runValidators: true }
    );
    res.json(updated!.toJSON());
  } catch (err: any) {
    console.error('[PUT /clients/:id]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /clients/:id — eliminar (solo si pertenece al usuario)
clientsRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const existing = await Client.findById(req.params['id']);
    if (!existing) { res.status(404).json({ error: 'Cliente no encontrado' }); return; }
    if (existing.userId !== uid) { res.status(403).json({ error: 'Acceso denegado' }); return; }
    await Client.findByIdAndDelete(req.params['id']);
    res.status(204).send();
  } catch (err: any) {
    console.error('[DELETE /clients/:id]', err);
    res.status(500).json({ error: err.message });
  }
});
