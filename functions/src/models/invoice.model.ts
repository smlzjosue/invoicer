export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id?: string;
  userId: string;
  invoiceNumber: string;
  status: 'draft' | 'pending' | 'paid';
  issueDate: string;
  dueDate: string;
  from: {
    name: string;
    email: string;
    phone?: string;
    address: string;
  };
  to: {
    name: string;
    email: string;
    phone?: string;
    address: string;
  };
  items: InvoiceItem[];
  notes: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  createdAt?: FirebaseFirestore.Timestamp | Date;
  updatedAt?: FirebaseFirestore.Timestamp | Date;
}

export interface CreateInvoiceDto {
  userId?: string;
  invoiceNumber: string;
  status: 'draft' | 'pending' | 'paid';
  issueDate: string;
  dueDate: string;
  from: { name: string; email: string; phone?: string; address: string };
  to: { name: string; email: string; phone?: string; address: string };
  items: InvoiceItem[];
  notes?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}
