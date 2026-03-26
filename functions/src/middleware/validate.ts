import { Request, Response, NextFunction } from 'express';

export function validateInvoice(req: Request, res: Response, next: NextFunction): void {
  const body = req.body;
  const errors: string[] = [];

  if (!body.invoiceNumber?.trim()) errors.push('invoiceNumber es requerido');
  if (!['draft', 'pending', 'paid'].includes(body.status)) errors.push('status debe ser draft | pending | paid');
  if (!body.issueDate) errors.push('issueDate es requerido');
  if (!body.dueDate) errors.push('dueDate es requerido');
  if (!body.from?.name?.trim()) errors.push('from.name es requerido');
  if (!body.from?.email?.trim()) errors.push('from.email es requerido');
  if (!body.to?.name?.trim()) errors.push('to.name es requerido');
  if (!body.to?.email?.trim()) errors.push('to.email es requerido');
  if (!Array.isArray(body.items) || body.items.length === 0) errors.push('items debe ser un array no vacío');
  if (typeof body.total !== 'number') errors.push('total debe ser un número');

  if (errors.length > 0) {
    res.status(400).json({ error: 'Payload inválido', details: errors });
    return;
  }
  next();
}
