# Plan: Fix Backend Local — MONGO_URI + Auth Token

## Diagnóstico

### Bug 1 — dotenv busca el .env en la ruta equivocada
`index.ts` compila a `functions/lib/index.js`.
`__dirname` en runtime = `functions/lib/`

```ts
// ACTUAL (ROTO): sube 2 niveles → busca en /invoicer-2/.env.dev  ← NO EXISTE
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

// CORRECTO: sube 1 nivel → busca en /invoicer-2/functions/.env.dev  ✓
dotenv.config({ path: path.resolve(__dirname, '../', envFile) });
```

Consecuencia: `MONGO_URI` nunca se carga → "Error de conexión a la base de datos".

---

### Bug 2 — Token "inválido" al usar el Firebase Emulator

El Firebase Functions Emulator (`localhost:5001`) llama a `getAuth().verifyIdToken()`
contra el servidor **real** de Firebase Auth. El token puede fallar si:
- **Expiró** (los ID tokens duran 1 hora — el curl tiene un token estático).
- El emulador no tiene acceso a red para validar.

**Solución limpia:** usar `npm run dev` (Express directo, port 5000) en lugar del
Firebase Emulator para desarrollo local. El emulador sirve para simular Cloud
Functions en un entorno Firebase completo; no es necesario para desarrollar el backend.

---

## Decisión de arquitectura

| Modo         | Comando          | Puerto | Carga env   | Auth real |
|--------------|------------------|--------|-------------|-----------|
| **Dev local**    | `npm run dev`    | 5000   | `.env.dev`  | ✓ sí      |
| Firebase Emu | `serve:local`    | 5001   | `.env.local`| depende   |
| Producción   | Firebase deploy  | —      | Runtime vars| ✓ sí      |

**Decisión:** `npm run dev` como comando de desarrollo local. El emulador queda
para pruebas de integración Firebase completas (futuro).

---

## Checklist de implementación

### Fase 1 — Fix dotenv path (Bug 1)
- [ ] Corregir `index.ts`: cambiar `'../../'` → `'../'`
- [ ] Corregir `server.ts`: mismo fix
- [ ] Compilar (`npm run build`) y verificar que no hay errores TS

### Fase 2 — Agregar endpoint de diagnóstico en /health
- [ ] Añadir a `GET /health`: campo `dbStatus` con `mongoose.connection.readyState`
- [ ] Añadir campo `mongoUri` que muestre solo si la var está definida (`true/false`)
  - **NUNCA** mostrar el valor real de la URI
- [ ] Probar: `curl http://localhost:5000/health` debe mostrar `{ status:'ok', dbStatus:1, mongoUriSet:true }`

### Fase 3 — Actualizar URL del frontend para modo dev
- [ ] Revisar `app/src/environments/environment.ts` — verificar que `apiUrl` apunta a `http://localhost:5000`
- [ ] Ajustar si apunta a `localhost:5001`

### Fase 4 — Simplificar firebase.json (opcional)
- [ ] Remover el emulador de Firestore de `firebase.json` (ya no se usa)
- [ ] Dejar solo el emulador de `functions` para cuando se necesite

### Fase 5 — Documentar flujo de desarrollo local
- [ ] Actualizar README o agregar sección en `work-plans/` con los comandos correctos:
  - Backend: `cd functions && npm run dev`
  - Frontend: `cd app && ionic serve`

### Fase 6 — Tests de regresión
- [ ] `npm test` — los 45 tests deben pasar sin cambios (usan MongoMemoryServer, no dependen del env)
- [ ] Smoke test manual:
  - `curl http://localhost:5000/health` → `{ status: 'ok', dbStatus: 1 }`
  - `curl -H "Authorization: Bearer <token-fresco>" http://localhost:5000/clients` → `[]` o lista

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `functions/src/index.ts` | Fix path: `../../` → `../` |
| `functions/src/server.ts` | Fix path: `../../` → `../` |
| `functions/src/app.ts` | Añadir info de diagnóstico a `/health` |
| `app/src/environments/environment.ts` | Verificar/ajustar `apiUrl` a port 5000 |
| `firebase.json` | Remover emulador de Firestore (opcional) |

---

## Resultado esperado

```
$ cd functions && npm run dev

> build
> tsc

[server] API corriendo en http://localhost:5000
[server] Env: dev

$ curl http://localhost:5000/health
{"status":"ok","env":"development","dbStatus":1,"mongoUriSet":true,"timestamp":"..."}

$ curl -H "Authorization: Bearer <token>" http://localhost:5000/clients
[]
```
