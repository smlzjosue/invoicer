import { Request, Response, NextFunction } from 'express';

export function validateClient(req: Request, res: Response, next: NextFunction): void {
  const body = req.body;
  const errors: string[] = [];

  if (!body.name?.trim()) errors.push('name es requerido');
  if (!body.email?.trim()) errors.push('email es requerido');
  if (typeof body.phone === 'undefined') errors.push('phone es requerido');
  if (typeof body.address === 'undefined') errors.push('address es requerido');

  if (errors.length > 0) {
    res.status(400).json({ error: 'Payload inválido', details: errors });
    return;
  }
  next();
}
