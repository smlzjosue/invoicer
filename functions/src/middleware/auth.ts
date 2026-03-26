import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado — token requerido' });
    return;
  }
  const token = header.slice(7);
  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email ?? '' };
    next();
  } catch (err: any) {
    console.error('[auth] verifyIdToken falló:', err.message);
    res.status(401).json({ error: 'No autorizado — token inválido' });
  }
}
