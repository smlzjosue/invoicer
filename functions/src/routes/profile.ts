import { Router, Request, Response } from 'express';
// [FIRESTORE COMENTADO] import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { UserProfile } from '../db/models/user-profile.schema';

export const profileRouter = Router();

// GET /profile — obtener perfil del usuario autenticado
profileRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const doc = await UserProfile.findOne({ userId: uid });
    if (!doc) { res.status(404).json({ error: 'Perfil no encontrado' }); return; }
    res.json(doc.toJSON());
  } catch (err: any) {
    console.error('[GET /profile]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /profile — crear o actualizar perfil del usuario autenticado (upsert)
profileRouter.put('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const { companyName, email, phone, address } = req.body;

    if (!companyName || !email) {
      res.status(400).json({ error: 'companyName y email son requeridos' });
      return;
    }

    const doc = await UserProfile.findOneAndUpdate(
      { userId: uid },
      { $set: { companyName, email, phone: phone ?? '', address: address ?? '' } },
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(doc!.toJSON());
  } catch (err: any) {
    console.error('[PUT /profile]', err);
    res.status(500).json({ error: err.message });
  }
});
