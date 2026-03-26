# Plan: Auth completa + Datos por usuario
**Fecha:** 2026-03-25
**Roles asumidos:** Arquitecto de seguridad Firebase · Especialista backend Node/Express · Ingeniero frontend Angular/Ionic · QA Engineer

---

## Diagnóstico del estado actual

| Componente | Estado | Detalle |
|-----------|--------|---------|
| `AuthService` | ✅ Completo | `login()`, `register()`, `loginWithGoogle()`, `loginWithApple()`, `resetPassword()`, `getInitialUser()`, `user$` |
| `LoginPage` | ✅ Completo | Tiene ambos modos (login/register), validación, toasts, Google, Apple |
| `AuthGuard` | ✅ Completo | Funcional |
| Backend auth middleware | ❌ Falta | La API acepta cualquier petición sin validar identidad |
| Datos aislados por usuario | ❌ Falta | Facturas y clientes no tienen `userId` — todos ven todo |
| HTTP Interceptor (frontend) | ❌ Falta | Ninguna petición envía `Authorization: Bearer <token>` |
| Perfil en Firestore | ❌ Falta | Solo existe en `localStorage` — se pierde al cambiar dispositivo |
| Endpoint `/profile` (API) | ❌ Falta | No existe ruta de perfil en el backend |

**Conclusión:** El flujo de auth del cliente ya está construido. El trabajo está íntegramente en la capa de datos: el backend debe verificar identidad y aislar datos por `uid`; el frontend debe enviar el token y migrar el perfil a la API.

---

## Arquitectura de solución

```
Firebase Auth  ──►  UID universal (mismo UID para Google, Email, Apple)
                          │
           ┌──────────────┼──────────────┐
           ▼              ▼              ▼
     invoices/{id}   clients/{id}  userProfiles/{uid}
     { userId: uid } { userId: uid }  { companyName, email, ... }

Frontend ──► HTTP Interceptor agrega "Authorization: Bearer <idToken>"
Backend  ──► auth middleware verifica token → extrae uid → filtra Firestore
```

**Principio clave:** El `uid` de Firebase Auth es el identificador universal. El mismo usuario que se registra con email/pass y luego con Google (mismo email) obtendrá el mismo `uid` si Firebase detecta la cuenta existente — o un toast de error orientativo si el proveedor difiere.

---

## Fases e items de trabajo

---

### FASE 1 — Backend: Tipado y middleware de autenticación

- [ ] **1.1** Crear `functions/src/types/express.d.ts`
  Extiende `Express.Request` con `user?: { uid: string; email: string }` para que TypeScript no se queje en los routes.

- [ ] **1.2** Crear `functions/src/middleware/auth.ts`
  - Extrae el token de `Authorization: Bearer <token>`
  - Llama a `admin.auth().verifyIdToken(token)` del SDK Admin
  - En éxito: `req.user = { uid: decoded.uid, email: decoded.email }` → `next()`
  - En fallo: `res.status(401).json({ error: 'No autorizado' })`

- [ ] **1.3** Aplicar el middleware globalmente en `functions/src/app.ts`
  Colocar `app.use(authMiddleware)` **después** de CORS y JSON parser pero **antes** de las rutas. El health check `/health` queda fuera del middleware (ruta publica de monitoreo).

---

### FASE 2 — Backend: Aislar facturas por usuario

- [ ] **2.1** Actualizar `functions/src/models/invoice.model.ts`
  Agregar `userId: string` como campo requerido en `Invoice` y `CreateInvoiceDto`.

- [ ] **2.2** Actualizar `functions/src/routes/invoices.ts`

  | Endpoint | Cambio |
  |---------|--------|
  | `GET /` | `.where('userId','==', uid).orderBy('createdAt','desc')` |
  | `GET /:id` | Verificar que `snap.data().userId === uid`, si no → 403 |
  | `POST /` | Inyectar `userId: req.user.uid` antes de guardar |
  | `PUT /:id` | Verificar que `snap.data().userId === uid`, si no → 403 |
  | `DELETE /:id` | Verificar que `snap.data().userId === uid`, si no → 403 |

  > El `userId` nunca viene del body del cliente — siempre del token verificado.

---

### FASE 3 — Backend: Aislar clientes por usuario

- [ ] **3.1** Actualizar `functions/src/models/client.model.ts`
  Agregar `userId: string` como campo requerido.

- [ ] **3.2** Actualizar `functions/src/routes/clients.ts`
  Mismos cambios que la fase 2 pero en la colección `clients`.

---

### FASE 4 — Backend: Endpoint de perfil de usuario

- [ ] **4.1** Crear `functions/src/models/profile.model.ts`
  ```typescript
  export interface UserProfile {
    companyName: string;
    email: string;
    phone?: string;
    address?: string;
    updatedAt?: any;
  }
  ```

- [ ] **4.2** Crear `functions/src/routes/profile.ts`

  | Endpoint | Acción |
  |---------|--------|
  | `GET /profile` | Lee `userProfiles/{uid}` → 200 con datos o 404 si no existe |
  | `PUT /profile` | `set({ ...body, updatedAt }, { merge: true })` en `userProfiles/{uid}` → 200 |

  La colección usa el `uid` como ID del documento: cada usuario tiene exactamente un documento de perfil.

- [ ] **4.3** Registrar ruta en `functions/src/app.ts`
  `app.use('/profile', profileRouter)` (requiere auth middleware ya aplicado globalmente).

---

### FASE 5 — Backend: Tests

- [ ] **5.1** Actualizar mock de Firestore en los tests existentes
  El mock actual no implementa `.where()`. Agregar soporte para:
  ```
  collection().where(field, op, value).orderBy().get()
  collection().where(field, op, value).get()
  collection().doc(id).set(data, options)   // para profile
  ```

- [ ] **5.2** Actualizar `tests/invoices.test.ts`
  - Todos los requests incluyen `Authorization: Bearer valid-token`
  - Mock de `firebase-admin/auth`: `verifyIdToken('valid-token')` → `{ uid: 'user-1', email: 'test@test.com' }`
  - Verificar que GET solo devuelve facturas del usuario autenticado
  - Agregar test: GET/:id de otra persona → 403
  - Agregar test: PUT/:id de otra persona → 403
  - Agregar test: DELETE/:id de otra persona → 403
  - Agregar test: request sin token → 401

- [ ] **5.3** Actualizar `tests/clients.test.ts`
  Mismos cambios que 5.2.

- [ ] **5.4** Crear `tests/auth-middleware.test.ts`
  - Sin header Authorization → 401
  - Token inválido → 401
  - Token válido → pasa al handler

- [ ] **5.5** Crear `tests/profile.test.ts`
  - GET perfil sin datos → 404
  - PUT crea perfil → 200
  - GET perfil existente → 200 con datos
  - GET sin auth → 401

---

### FASE 6 — Frontend: HTTP Interceptor

- [ ] **6.1** Agregar `getIdToken(): Promise<string | null>` a `AuthService`
  ```typescript
  async getIdToken(): Promise<string | null> {
    return this.auth.currentUser?.getIdToken() ?? null;
  }
  ```

- [ ] **6.2** Crear `app/src/app/interceptors/auth.interceptor.ts`
  - Obtiene el ID token con `authService.getIdToken()`
  - Clona el request con header `Authorization: Bearer <token>`
  - Si no hay token (usuario no autenticado), pasa el request sin modificar

- [ ] **6.3** Registrar el interceptor en `AppModule`
  ```typescript
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ```

---

### FASE 7 — Frontend: UserProfileService migrado a API

- [ ] **7.1** Agregar `profileUrl` a los tres archivos `environment*.ts`
  ```
  dev:  http://localhost:5001/invoicer-dev/us-central1/api/profile
  qa:   https://us-central1-invoicer-qa.cloudfunctions.net/api/profile
  prod: https://us-central1-invoicer-6a7c2.cloudfunctions.net/api/profile
  ```

- [ ] **7.2** Actualizar `UserProfileService`
  Estrategia: **API como fuente de verdad + localStorage como caché de lectura rápida**

  ```typescript
  // Lectura rápida (síncrona) desde caché local — para auto-fill en editor
  getProfile(): UserProfile | null          // lee localStorage

  // Carga desde API y actualiza caché — llamar en init/login
  loadProfile(): Observable<UserProfile | null>  // GET /profile → guarda en localStorage

  // Guarda en API Y actualiza caché local
  saveProfile(profile: UserProfile): Observable<void>  // PUT /profile → localStorage

  hasProfile(): boolean                     // comprueba localStorage
  ```

- [ ] **7.3** Llamar `loadProfile()` en `ShellComponent.ngOnInit()`
  Después de resolver el usuario autenticado, hacer el load inicial. Así el perfil estará disponible para auto-fill cuando el usuario abra el editor.

- [ ] **7.4** Actualizar `ProfilePage`
  - `ngOnInit`: llamar `loadProfile()` (Observable) en vez de solo leer localStorage
  - `save()`: llamar `saveProfile()` que ahora devuelve Observable
  - Mostrar spinner mientras carga

---

### FASE 8 — Limpieza y validación E2E manual

- [ ] **8.1** Verificar que el emulador de Firebase Admin verifica tokens del emulador de Auth
  En dev se usa `FIREBASE_AUTH_EMULATOR_HOST`. Confirmar que `functions/src/index.ts` lo configura, o agregar la variable al `.env` local.

- [ ] **8.2** Flujo E2E manual completo:
  - [ ] Registrar usuario con email/password → ve dashboard vacío
  - [ ] Crear factura → solo aparece en su cuenta
  - [ ] Crear cliente → solo aparece en su cuenta
  - [ ] Guardar perfil → persiste al recargar
  - [ ] Cerrar sesión → login → mismo perfil, mismas facturas
  - [ ] Entrar con Google (distinto usuario) → ve datos de su cuenta, no del anterior
  - [ ] Registrar con Google (email nuevo) → dashboard vacío, puede crear perfil

- [ ] **8.3** Actualizar `context/frontend.md` y `context/overview.md`
  Documentar el interceptor, los cambios al `UserProfileService` y el nuevo endpoint `/profile`.

---

## Archivos a crear / modificar

### Backend (`functions/`)
| Acción | Archivo |
|--------|---------|
| CREAR | `src/types/express.d.ts` |
| CREAR | `src/middleware/auth.ts` |
| CREAR | `src/models/profile.model.ts` |
| CREAR | `src/routes/profile.ts` |
| CREAR | `tests/auth-middleware.test.ts` |
| CREAR | `tests/profile.test.ts` |
| MODIFICAR | `src/app.ts` |
| MODIFICAR | `src/models/invoice.model.ts` |
| MODIFICAR | `src/models/client.model.ts` |
| MODIFICAR | `src/routes/invoices.ts` |
| MODIFICAR | `src/routes/clients.ts` |
| MODIFICAR | `tests/invoices.test.ts` |
| MODIFICAR | `tests/clients.test.ts` |

### Frontend (`app/`)
| Acción | Archivo |
|--------|---------|
| CREAR | `src/app/interceptors/auth.interceptor.ts` |
| MODIFICAR | `src/app/services/auth.service.ts` (agregar `getIdToken()`) |
| MODIFICAR | `src/app/services/user-profile.service.ts` |
| MODIFICAR | `src/app/app.module.ts` |
| MODIFICAR | `src/app/shell/shell.component.ts` |
| MODIFICAR | `src/app/pages/profile/profile.page.ts` |
| MODIFICAR | `src/environments/environment.ts` |
| MODIFICAR | `src/environments/environment.qa.ts` |
| MODIFICAR | `src/environments/environment.prod.ts` |

---

## Riesgos y decisiones clave

| Riesgo | Decisión |
|--------|---------|
| Datos existentes sin `userId` en Firestore | Aceptable — ambiente de dev, sin datos de producción aún |
| Firebase Auth emulator vs. producción en tests | Los tests mockean `verifyIdToken` — no dependen del emulador |
| Cuenta Google + Email mismo correo | Firebase arroja `auth/account-exists-with-different-credential` — el `AuthService` ya traduce este error al usuario |
| Token expirado (1 hora) | `getIdToken()` del SDK cliente ya maneja refresh automático |

---

## Conteo de tests esperados

| Suite | Tests actuales | Tests nuevos | Total |
|-------|---------------|-------------|-------|
| `invoices.test.ts` | 12 | +4 (auth: 401, 403×2, userId-scoped) | 16 |
| `clients.test.ts` | 12 | +4 (idem) | 16 |
| `auth-middleware.test.ts` | 0 | +3 | 3 |
| `profile.test.ts` | 0 | +4 | 4 |
| **Total** | **24** | **+15** | **39** |
