# FacturaFácil — Referencia de API

## Base URLs por Ambiente

| Ambiente | URL Base |
|----------|---------|
| DEV (local) | `http://localhost:5001/invoicer-dev/us-central1/api` |
| QA | `https://us-central1-invoicer-qa.cloudfunctions.net/api` |
| PROD | `https://us-central1-invoicer-6a7c2.cloudfunctions.net/api` |

---

## Endpoints

### `GET /health`
Verifica que la API está corriendo.

**Respuesta 200:**
```json
{
  "status": "ok",
  "env": "development",
  "timestamp": "2026-03-25T22:00:00.000Z"
}
```
El campo `env` refleja la variable `APP_ENV` del archivo `.env.*` del ambiente activo.

---

### `GET /invoices`
Lista todas las facturas ordenadas por `createdAt desc`.

**Respuesta 200:**
```json
[
  {
    "id": "abc123",
    "invoiceNumber": "INV-202603-4521",
    "status": "draft",
    ...
  }
]
```

---

### `GET /invoices/:id`
Obtiene una factura por ID.

**Respuesta 200:** Objeto `Invoice` completo.
**Respuesta 404:** `{ "error": "Factura no encontrada" }`

---

### `POST /invoices`
Crea una nueva factura.

**Body (requerido):** Ver `Invoice` más abajo.

**Respuesta 201:** Factura creada con `id` asignado por Firestore.
**Respuesta 400:** `{ "error": "Validación fallida", "details": ["..."] }`

---

### `PUT /invoices/:id`
Actualiza una factura existente.

**Body:** Mismo shape que POST (campos actualizables).

**Respuesta 200:** Factura actualizada.
**Respuesta 404:** `{ "error": "Factura no encontrada" }`

---

### `DELETE /invoices/:id`
Elimina una factura.

**Respuesta 204:** Sin body.
**Respuesta 404:** `{ "error": "Factura no encontrada" }`

---

## Validaciones del Middleware (`validate.ts`)

Campos requeridos en POST/PUT:
- `invoiceNumber` (string)
- `status` — debe ser `draft | pending | paid`
- `issueDate`, `dueDate` (string)
- `from.name`, `from.email`
- `to.name`, `to.email`
- `items` — array con al menos 1 elemento
- `subtotal`, `taxRate`, `taxAmount`, `total` (números)

---

---

## Endpoints de Clientes (`/clients`)

### `GET /clients`
Lista todos los clientes ordenados por `createdAt desc`.

### `GET /clients/:id`
Obtiene un cliente por ID. **404** si no existe.

### `POST /clients`
Crea un nuevo cliente.

**Body requerido:**
```json
{ "name": "Acme Corp", "email": "contacto@acme.com", "phone": "+52 55 ...", "address": "Av. ..." }
```
**Respuesta 201:** Cliente con `id`. **400** si falta `name` o `email`.

### `PUT /clients/:id`
Actualiza un cliente existente. Mismo body que POST. **404** si no existe.

### `DELETE /clients/:id`
Elimina un cliente. **204** en éxito. **404** si no existe.

### Validaciones (`validateClient.ts`)
- `name` — requerido, string no vacío
- `email` — requerido, string no vacío
- `phone` — requerido como clave (puede ser `""`)
- `address` — requerido como clave (puede ser `""`)

---

## CORS

Los orígenes permitidos se leen de la variable de entorno `ALLOWED_ORIGINS` (separados por coma).

| Ambiente | Valor por defecto |
|----------|-----------------|
| DEV | `http://localhost:8100` |
| QA | `https://qa.invoicer.app` |
| PROD | `https://invoicer.app` |
