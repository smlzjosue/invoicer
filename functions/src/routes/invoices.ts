import { Router, Request, Response } from 'express';
// [FIRESTORE COMENTADO] import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Invoice } from '../db/models/invoice.schema';
import { validateInvoice } from '../middleware/validate';

export const invoicesRouter = Router();

// GET /invoices — listar solo las del usuario autenticado
invoicesRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const invoices = await Invoice.find({ userId: uid })
      .sort({ createdAt: -1 })
      .lean({ transform: (doc: any) => { if (doc._id) { doc.id = doc._id.toString(); delete doc._id; } delete doc.__v; return doc; } });
    res.json(invoices);
  } catch (err: any) {
    console.error('[GET /invoices]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /invoices/:id — obtener una (solo si pertenece al usuario)
invoicesRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const doc = await Invoice.findById(req.params['id']);
    if (!doc) { res.status(404).json({ error: 'Factura no encontrada' }); return; }
    if (doc.userId !== uid) { res.status(403).json({ error: 'Acceso denegado' }); return; }
    res.json(doc.toJSON());
  } catch (err: any) {
    console.error('[GET /invoices/:id]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /invoices — crear (inyecta userId del token)
invoicesRouter.post('/', validateInvoice, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const { userId: _strip, ...payload } = req.body;
    const doc = await new Invoice({ ...payload, userId: uid }).save();
    res.status(201).json(doc.toJSON());
  } catch (err: any) {
    console.error('[POST /invoices]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /invoices/:id — actualizar (solo si pertenece al usuario)
invoicesRouter.put('/:id', validateInvoice, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const existing = await Invoice.findById(req.params['id']);
    if (!existing) { res.status(404).json({ error: 'Factura no encontrada' }); return; }
    if (existing.userId !== uid) { res.status(403).json({ error: 'Acceso denegado' }); return; }
    const { userId: _strip, ...payload } = req.body;
    const updated = await Invoice.findByIdAndUpdate(
      req.params['id'],
      { ...payload },
      { returnDocument: 'after', runValidators: true }
    );
    res.json(updated!.toJSON());
  } catch (err: any) {
    console.error('[PUT /invoices/:id]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /invoices/:id — eliminar (solo si pertenece al usuario)
invoicesRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const existing = await Invoice.findById(req.params['id']);
    if (!existing) { res.status(404).json({ error: 'Factura no encontrada' }); return; }
    if (existing.userId !== uid) { res.status(403).json({ error: 'Acceso denegado' }); return; }
    await Invoice.findByIdAndDelete(req.params['id']);
    res.status(204).send();
  } catch (err: any) {
    console.error('[DELETE /invoices/:id]', err);
    res.status(500).json({ error: err.message });
  }
});
