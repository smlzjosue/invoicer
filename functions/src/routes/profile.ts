import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const profileRouter = Router();
const COLLECTION = 'userProfiles';

// GET /profile — obtener perfil del usuario autenticado
profileRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const uid = req.user!.uid;
    const snap = await db.collection(COLLECTION).doc(uid).get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }
    res.json({ id: snap.id, ...snap.data() });
  } catch (err: any) {
    console.error('[GET /profile]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /profile — crear o actualizar perfil del usuario autenticado
profileRouter.put('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const uid = req.user!.uid;
    const { companyName, email, phone, address } = req.body;

    if (!companyName || !email) {
      res.status(400).json({ error: 'companyName y email son requeridos' });
      return;
    }

    await db.collection(COLLECTION).doc(uid).set(
      {
        companyName,
        email,
        phone: phone ?? '',
        address: address ?? '',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const updated = await db.collection(COLLECTION).doc(uid).get();
    res.json({ id: uid, ...updated.data() });
  } catch (err: any) {
    console.error('[PUT /profile]', err);
    res.status(500).json({ error: err.message });
  }
});
