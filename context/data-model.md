# FacturaFácil — Modelo de Datos

## Invoice (Factura)

Colección Firestore: `invoices`

```typescript
interface Invoice {
  id?: string;                        // Asignado por Firestore
  invoiceNumber: string;              // Ej: "INV-202603-4521"
  status: 'draft' | 'pending' | 'paid';

  issueDate: string;                  // "YYYY-MM-DD"
  dueDate: string;                    // "YYYY-MM-DD"

  from: {
    name: string;
    email: string;
    phone?: string;    // Opcional — no rompe facturas existentes
    address: string;
  };

  to: {
    name: string;
    email: string;
    phone?: string;    // Opcional — se llena al seleccionar un Cliente
    address: string;
  };

  items: InvoiceItem[];               // Al menos 1 item

  notes: string;                      // Notas adicionales (puede ser "")

  subtotal: number;                   // Suma de (quantity * rate)
  taxRate: number;                    // Porcentaje (0-100)
  taxAmount: number;                  // subtotal * (taxRate / 100)
  total: number;                      // subtotal + taxAmount

  createdAt?: Timestamp;              // Asignado por Firestore serverTimestamp
  updatedAt?: Timestamp;              // Actualizado en cada PUT
}

interface InvoiceItem {
  description: string;
  quantity: number;                   // > 0
  rate: number;                       // >= 0
  amount: number;                     // quantity * rate (calculado)
}
```

## UserProfile (Perfil del emisor)

Almacenado en `localStorage` — key: `invoicer_user_profile`

```typescript
interface UserProfile {
  companyName: string;  // → from.name en facturas
  email: string;        // → from.email
  phone: string;        // → from.phone
  address: string;      // → from.address
}
```

> **Nota:** No usa Firestore ni el backend. El `UserProfileService` es el único punto a cambiar si en el futuro se quiere sincronización multi-dispositivo.

## Client (Cliente)

Colección Firestore: `clients`

```typescript
interface Client {
  id?: string;           // Asignado por Firestore
  name: string;          // Nombre o empresa
  email: string;
  phone: string;         // Teléfono (puede ser cadena vacía)
  address: string;       // Dirección (puede ser cadena vacía)
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

## Generación del invoiceNumber

Formato: `INV-{YEAR}{MONTH}-{RANDOM4}`

Ejemplo: `INV-202603-4521`

Generado en el cliente (`InvoiceService.generateInvoiceNumber()`), no en el servidor.

## Estados del ciclo de vida

```
draft ──► pending ──► paid
  │                    │
  └────────────────────┘
       (cualquier transición manual)
```

| Estado | Color UI | Label |
|--------|---------|-------|
| `draft` | medium (gris) | Borrador |
| `pending` | warning (amarillo) | Pendiente |
| `paid` | success (verde) | Pagada |

## Cálculo de totales

```typescript
// En InvoiceService.calculateTotals()
subtotal  = items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
taxAmount = subtotal * (taxRate / 100)
total     = subtotal + taxAmount
```
