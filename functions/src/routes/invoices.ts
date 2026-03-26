import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { validateInvoice } from '../middleware/validate';
import { CreateInvoiceDto } from '../models/invoice.model';

export const invoicesRouter = Router();
const COLLECTION = 'invoices';

// GET /invoices — listar solo las del usuario autenticado
invoicesRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const uid = req.user!.uid;
    const snap = await db.collection(COLLECTION)
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();
    const invoices = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(invoices);
  } catch (err: any) {
    console.error('[GET /invoices]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /invoices/:id — obtener una (solo si pertenece al usuario)
invoicesRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const uid = req.user!.uid;
    const docRef = db.collection(COLLECTION).doc(req.params['id']);
    const snap = await docRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Factura no encontrada' });
      return;
    }
    if (snap.data()!['userId'] !== uid) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }
    res.json({ id: snap.id, ...snap.data() });
  } catch (err: any) {
    console.error('[GET /invoices/:id]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /invoices — crear (inyecta userId del token)
invoicesRouter.post('/', validateInvoice, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const uid = req.user!.uid;
    const payload: CreateInvoiceDto = req.body;
    const docRef = await db.collection(COLLECTION).add({
      ...payload,
      userId: uid,
      notes: payload.notes ?? '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const created = await docRef.get();
    res.status(201).json({ id: docRef.id, ...created.data() });
  } catch (err: any) {
    console.error('[POST /invoices]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /invoices/:id — actualizar (solo si pertenece al usuario)
invoicesRouter.put('/:id', validateInvoice, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const uid = req.user!.uid;
    const docRef = db.collection(COLLECTION).doc(req.params['id']);
    const snap = await docRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Factura no encontrada' });
      return;
    }
    if (snap.data()!['userId'] !== uid) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }
    const { userId: _strip, ...payload }: Partial<CreateInvoiceDto> = req.body;
    await docRef.update({
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const updated = await docRef.get();
    res.json({ id: docRef.id, ...updated.data() });
  } catch (err: any) {
    console.error('[PUT /invoices/:id]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /invoices/:id — eliminar (solo si pertenece al usuario)
invoicesRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const uid = req.user!.uid;
    const docRef = db.collection(COLLECTION).doc(req.params['id']);
    const snap = await docRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Factura no encontrada' });
      return;
    }
    if (snap.data()!['userId'] !== uid) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }
    await docRef.delete();
    res.status(204).send();
  } catch (err: any) {
    console.error('[DELETE /invoices/:id]', err);
    res.status(500).json({ error: err.message });
  }
});
