# Plan: Migración de Firestore → MongoDB (Mongoose)
**Fecha:** 2026-03-25
**Roles asumidos:** Arquitecto de bases de datos NoSQL · Especialista MongoDB/Mongoose · Ingeniero backend Node.js/TypeScript · QA Engineer

---

## Diagnóstico del estado actual

### Qué usa Firestore hoy

| Archivo | Uso de Firestore |
|---------|-----------------|
| `src/routes/invoices.ts` | `getFirestore()`, `.where()`, `.orderBy()`, `.add()`, `.doc().get/update/delete()`, `FieldValue.serverTimestamp()` |
| `src/routes/clients.ts` | Ídem |
| `src/routes/profile.ts` | `getFirestore()`, `.doc(uid).get()`, `.doc(uid).set({ merge: true })` |
| `src/index.ts` | `initializeApp()` — inicializa Firebase App (necesario también para Auth) |
| `tests/*.test.ts` | Mock manual de `firebase-admin/firestore` con store en memoria |

### Qué NO cambia

| Componente | Motivo |
|-----------|--------|
| `src/middleware/auth.ts` | Usa `firebase-admin/auth` (verifica ID tokens) — no Firestore |
| `src/index.ts → initializeApp()` | Requerido para que `getAuth()` funcione en el middleware |
| `firebase-admin` como dependencia | Se mantiene por Auth; solo se comenta/elimina el uso de Firestore |
| Frontend completo | El frontend consume la API REST — no sabe nada de la DB |
| Express, cors, validadores | Sin cambios |

### Decisión de ORM/Driver

**Elegido: Mongoose v8**
- Schemas con tipado TypeScript nativo
- `findOne`, `find`, `save`, `findOneAndUpdate` — queries limpias
- Transform `toJSON` para mapear `_id → id` automáticamente
- `mongodb-memory-server` para tests en memoria reales (equivalente al mock actual)
- Amplia documentación y ecosistema

---

## Arquitectura post-migración

```
HTTP Request
     │
     ▼
authMiddleware (firebase-admin/auth) ← Sin cambios
     │
     ▼
connectDb() middleware ─── MONGO_URI ──► MongoDB Atlas (prod)
     │                                   MongoDB local / Atlas (dev)
     ▼
Route handlers
  invoices.ts  ──► Invoice model  (Mongoose)
  clients.ts   ──► Client model   (Mongoose)
  profile.ts   ──► Profile model  (Mongoose)

Colecciones Firestore comentadas:  'invoices' / 'clients' / 'userProfiles'
Colecciones MongoDB:               invoices   / clients   / userprofiles
```

---

## Fases e items de trabajo

---

### FASE 1 — Dependencias

- [ ] **1.1** Instalar `mongoose` como dependencia de producción
  ```bash
  cd functions && npm install mongoose
  ```

- [ ] **1.2** Instalar `mongodb-memory-server` como devDependency (para tests)
  ```bash
  npm install --save-dev mongodb-memory-server
  ```

- [ ] **1.3** Instalar tipos de Mongoose (ya incluidos en el paquete v8+, verificar)
  ```bash
  npm install --save-dev @types/mongoose  # solo si tsc se queja
  ```

---

### FASE 2 — Módulo de conexión MongoDB

- [ ] **2.1** Crear `functions/src/db/connection.ts`

  Patrón connection-caching para Cloud Functions (el proceso puede reutilizarse entre invocaciones):
  ```typescript
  import mongoose from 'mongoose';

  let isConnected = false;

  export async function connectDb(): Promise<void> {
    if (isConnected || mongoose.connection.readyState === 1) return;
    const uri = process.env['MONGO_URI'];
    if (!uri) throw new Error('MONGO_URI no está definida en las variables de entorno');
    await mongoose.connect(uri);
    isConnected = true;
  }
  ```

- [ ] **2.2** Registrar `connectDb()` como middleware en `functions/src/app.ts`

  Se coloca después de CORS/JSON y antes de `authMiddleware`, para que la conexión esté lista antes de cualquier ruta:
  ```typescript
  app.use(async (_req, res, next) => {
    try { await connectDb(); next(); }
    catch (err: any) { res.status(500).json({ error: 'Error de conexión a la base de datos' }); }
  });
  ```

---

### FASE 3 — Schemas y Modelos Mongoose

- [ ] **3.1** Crear `functions/src/db/models/invoice.schema.ts`

  Schema con:
  - Todos los campos del `Invoice` actual + `userId: String` (requerido, indexado)
  - Sub-documento para `from`, `to` (nombre, email, phone, address)
  - Array de `items` (description, quantity, rate, amount)
  - `status: enum ['draft', 'pending', 'paid']`
  - `timestamps: true` (Mongoose agrega `createdAt`/`updatedAt` automáticamente)
  - Transform `toJSON`: `_id → id`, eliminar `__v`

- [ ] **3.2** Crear `functions/src/db/models/client.schema.ts`

  Schema con: `userId`, `name`, `email`, `phone`, `address`, `timestamps: true`
  Transform `toJSON`: `_id → id`, eliminar `__v`

- [ ] **3.3** Crear `functions/src/db/models/user-profile.schema.ts`

  Schema con: `userId` (unique), `companyName`, `email`, `phone`, `address`, `timestamps: true`
  Transform `toJSON`: `id = userId` (para mantener compatibilidad con la respuesta actual), eliminar `_id`, `__v`

  > **Nota importante:** A diferencia de Firestore donde el `uid` era el ID del documento, en MongoDB se usa un campo `userId` con índice único. La respuesta de la API mantiene `{ id: uid, ... }` usando la transform.

---

### FASE 4 — Comentar / eliminar uso de Firestore en las rutas

- [ ] **4.1** En `functions/src/routes/invoices.ts`:
  - Comentar: `import { getFirestore, FieldValue } from 'firebase-admin/firestore'`
  - Eliminar todas las llamadas a `getFirestore()`, `.collection()`, `FieldValue.serverTimestamp()`

- [ ] **4.2** En `functions/src/routes/clients.ts`: mismo proceso

- [ ] **4.3** En `functions/src/routes/profile.ts`: mismo proceso

- [ ] **4.4** En `functions/src/index.ts`:
  - Mantener `initializeApp()` (necesario para Auth)
  - Comentar cualquier import explícito de `firebase-admin/firestore` si existe
  - Agregar comentario explicando que Firebase se mantiene SOLO para Auth

- [ ] **4.5** En `functions/src/models/invoice.model.ts` y `client.model.ts`:
  - Eliminar `FirebaseFirestore.Timestamp` de los tipos (reemplazar por `Date`)

---

### FASE 5 — Migrar rutas a MongoDB/Mongoose

Equivalencias de operaciones Firestore → Mongoose:

| Operación | Firestore | Mongoose |
|-----------|-----------|---------|
| Listar por usuario | `.where('userId','==',uid).orderBy('createdAt','desc').get()` | `.find({ userId: uid }).sort({ createdAt: -1 })` |
| Obtener por ID | `.doc(id).get()` + check exists | `.findById(id)` |
| Verificar owner | `data().userId !== uid` | `doc.userId !== uid` |
| Crear | `.add({ ...payload, userId, createdAt: serverTimestamp() })` | `new Model({ ...payload, userId }).save()` |
| Actualizar | `.doc(id).update({ ...payload, updatedAt: serverTimestamp() })` | `.findByIdAndUpdate(id, payload, { new: true })` |
| Eliminar | `.doc(id).delete()` | `.findByIdAndDelete(id)` |
| Perfil (upsert) | `.doc(uid).set({ ... }, { merge: true })` | `.findOneAndUpdate({ userId: uid }, { $set: data }, { upsert: true, new: true })` |

- [ ] **5.1** Migrar `functions/src/routes/invoices.ts` — 5 endpoints

- [ ] **5.2** Migrar `functions/src/routes/clients.ts` — 5 endpoints

- [ ] **5.3** Migrar `functions/src/routes/profile.ts` — 2 endpoints

---

### FASE 6 — Variables de entorno

- [ ] **6.1** Actualizar `functions/.env.example` — agregar `MONGO_URI`
  ```
  APP_ENV=development
  ALLOWED_ORIGINS=http://localhost:8100
  MONGO_URI=mongodb://localhost:27017/invoicer    # local
  # MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/invoicer  # Atlas
  ```

- [ ] **6.2** Crear `functions/.env.dev` (local, gitignoreado)
  ```
  APP_ENV=development
  ALLOWED_ORIGINS=http://localhost:8100
  MONGO_URI=mongodb://localhost:27017/invoicer-dev
  ```
  > Requiere MongoDB instalado localmente (`brew install mongodb-community`) O usar MongoDB Atlas free tier.

- [ ] **6.3** Crear `functions/.env.prod` (local, gitignoreado) — conexión Atlas producción
  ```
  APP_ENV=prod
  ALLOWED_ORIGINS=https://invoicer-6a7c2.web.app,https://invoicer-6a7c2.firebaseapp.com
  MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/invoicer-prod
  ```

---

### FASE 7 — Actualizar Tests

Los tests actuales mockean Firestore manualmente con un store en memoria. Con MongoDB se usa `mongodb-memory-server` que levanta un MongoDB real en memoria — más realista y sin mocks frágiles.

- [ ] **7.1** Actualizar `functions/tests/setup.ts`

  Reemplazar el comentario actual por setup real con `MongoMemoryServer`:
  ```typescript
  import { MongoMemoryServer } from 'mongodb-memory-server';
  import mongoose from 'mongoose';

  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env['MONGO_URI'] = mongod.getUri();
    await mongoose.connect(mongod.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    const cols = mongoose.connection.collections;
    for (const key in cols) {
      await cols[key].deleteMany({});
    }
  });
  ```

- [ ] **7.2** Actualizar `jest` config en `functions/package.json`

  Cambiar `"setupFiles"` → `"setupFilesAfterFramework"` para soportar async setup:
  ```json
  "globalSetup": "./tests/setup.ts"  // alternativa si se necesita
  ```
  > `setupFilesAfterFramework` ejecuta el archivo después del framework y soporta `beforeAll`/`afterAll` async.

- [ ] **7.3** Actualizar `functions/tests/invoices.test.ts`
  - Eliminar el bloque `mockDb` + `let store` (el store en memoria ya no es necesario)
  - Eliminar `jest.mock('firebase-admin/firestore', ...)`
  - Mantener `jest.mock('firebase-admin/auth', ...)`
  - Eliminar `beforeEach(() => { store = {}; })` (el setup global limpia las colecciones)
  - Los tests no necesitan otros cambios — los payloads y assertions son iguales

- [ ] **7.4** Actualizar `functions/tests/clients.test.ts` — mismos cambios que 7.3

- [ ] **7.5** Actualizar `functions/tests/auth-middleware.test.ts` — mismos cambios que 7.3

- [ ] **7.6** Actualizar `functions/tests/profile.test.ts` — mismos cambios que 7.3

- [ ] **7.7** Ejecutar tests y verificar que los **45 tests pasan**
  ```bash
  cd functions && npm test
  ```

---

### FASE 8 — Smoke test local

- [ ] **8.1** Build TypeScript
  ```bash
  cd functions && npm run build
  ```

- [ ] **8.2** Iniciar el servidor local con `.env.dev`
  ```bash
  firebase emulators:start --only functions
  # o directamente: node -r dotenv/config lib/index.js
  ```

- [ ] **8.3** Verificar health endpoint
  ```bash
  curl http://localhost:5001/invoicer-dev/us-central1/api/health
  ```

- [ ] **8.4** Verificar un endpoint autenticado (con token mock o real de Firebase Auth emulado)

---

### FASE 9 — Commit y push al repo

- [ ] **9.1** Commit de todos los cambios
  ```bash
  git add functions/src/ functions/tests/ functions/package.json functions/package-lock.json
  git commit -m "feat: migrate from Firestore to MongoDB (Mongoose)"
  git push
  ```

---

## Archivos a crear / modificar

### Backend (`functions/`)

| Acción | Archivo |
|--------|---------|
| CREAR | `src/db/connection.ts` |
| CREAR | `src/db/models/invoice.schema.ts` |
| CREAR | `src/db/models/client.schema.ts` |
| CREAR | `src/db/models/user-profile.schema.ts` |
| MODIFICAR | `src/app.ts` (agregar middleware de conexión) |
| MODIFICAR | `src/index.ts` (comentar Firestore, mantener Auth) |
| MODIFICAR | `src/routes/invoices.ts` (Firestore → Mongoose) |
| MODIFICAR | `src/routes/clients.ts` (Firestore → Mongoose) |
| MODIFICAR | `src/routes/profile.ts` (Firestore → Mongoose) |
| MODIFICAR | `src/models/invoice.model.ts` (eliminar tipos Firestore) |
| MODIFICAR | `src/models/client.model.ts` (eliminar tipos Firestore) |
| MODIFICAR | `tests/setup.ts` (MongoMemoryServer) |
| MODIFICAR | `tests/invoices.test.ts` (eliminar mockDb Firestore) |
| MODIFICAR | `tests/clients.test.ts` (eliminar mockDb Firestore) |
| MODIFICAR | `tests/auth-middleware.test.ts` (eliminar mockDb Firestore) |
| MODIFICAR | `tests/profile.test.ts` (eliminar mockDb Firestore) |
| MODIFICAR | `package.json` (agregar mongoose, mongodb-memory-server) |
| MODIFICAR | `.env.example` (agregar MONGO_URI) |
| CREAR (local) | `.env.dev` (MONGO_URI local) |
| CREAR (local) | `.env.prod` (MONGO_URI Atlas) |

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|-----------|
| `mongodb-memory-server` descarga binarios en CI/CD | Media | Configurar `MONGOMS_VERSION` y caché |
| Transformación `_id → id` inconsistente en respuestas | Alta | Usar `toJSON` transform global en cada schema |
| `connectDb()` lanza timeout en Cloud Functions cold start | Media | Conexión lazy con guard `isConnected`; Atlas en us-central1 |
| MongoDB Atlas: Cloud Functions IPs no en whitelist | Alta | En Atlas → Network Access → Allow from anywhere (0.0.0.0/0) para Cloud Functions |
| Tests lentos por MongoMemoryServer startup | Baja | Server compartido entre todos los archivos con `globalSetup` |
| Datos de Firestore existentes no migran | Baja | Ambiente dev sin datos reales; migración fuera del alcance |

---

## Prerequisitos del usuario (antes de proceder)

1. **Decidir donde hospedas MongoDB:**
   - **Opción A — MongoDB Atlas (recomendado):** Cuenta gratuita en `cloud.mongodb.com`, cluster M0 free tier. Obtener connection string `mongodb+srv://...`
   - **Opción B — Local:** `brew install mongodb-community && brew services start mongodb-community` (solo para desarrollo)

2. **Proporcionar la MONGO_URI** para:
   - Desarrollo: URI local o Atlas dev cluster
   - Producción: Atlas production cluster

> Una vez que confirmes la opción de hosting y proporciones (o crees) las URIs, ejecuto el plan completo.
