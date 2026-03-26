# Plan: Deploy a Firebase — Functions + Hosting (Producción)
**Fecha:** 2026-03-25
**Roles asumidos:** DevOps Firebase · Arquitecto Cloud · Ingeniero de Release

---

## Diagnóstico del estado actual

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Firebase CLI autenticado | ✅ | `firebase 14.2.1`, sesión activa |
| Proyecto `invoicer-6a7c2` (prod) | ✅ Existe | Único proyecto real disponible |
| Proyecto `invoicer-dev` | ❌ No existe | Solo el emulador local |
| Proyecto `invoicer-qa` | ❌ No existe | Pendiente creación |
| Firebase Functions en `firebase.json` | ✅ Configurado | Source: `functions/` |
| Firebase Hosting en `firebase.json` | ❌ Falta | No hay sección `hosting` |
| CORS en la Function | ⚠️ Solo localhost | `ALLOWED_ORIGINS` default = `localhost:8100` |
| Plan Firebase (Blaze) | ⚠️ Requerido | Cloud Functions requiere plan de pago |
| Firestore habilitado en prod | ⚠️ Por verificar | Debe estar en modo Native, us-central1 |
| Firebase Auth (Google) habilitado | ⚠️ Por verificar | Requiere activación en Console |
| Build Angular para producción | ❌ No ejecutado | Output a `app/www/` |
| Build TypeScript functions | ❌ No ejecutado | Output a `functions/lib/` |

**Alcance:** Despliegue a **producción** (`invoicer-6a7c2`). Se excluyen dev y qa hasta que el usuario cree esos proyectos.

---

## Arquitectura del deploy

```
GitHub repo
     │
     ├─ functions/          → Firebase Cloud Functions (us-central1)
     │   ├─ tsc build       →  functions/lib/
     │   └─ firebase deploy → https://us-central1-invoicer-6a7c2.cloudfunctions.net/api
     │
     └─ app/                → Firebase Hosting
         ├─ ng build:prod   →  app/www/
         └─ firebase deploy → https://invoicer-6a7c2.web.app
```

---

## Fases e items de trabajo

---

### FASE 0 — Prerequisitos en Firebase Console *(acciones manuales del usuario)*

Estas acciones **no se pueden automatizar** — requieren acceso a la consola web de Firebase.

- [ ] **0.1 Activar plan Blaze** en `invoicer-6a7c2`
  - Ir a: `console.firebase.google.com` → proyecto Invoicer → Upgrade
  - Sin Blaze, el deploy de Functions falla con error de billing
  - El plan Blaze es pay-as-you-go (tiene free tier generoso para proyectos pequeños)

- [ ] **0.2 Habilitar Firestore** (si no está activo)
  - Firebase Console → Build → Firestore Database → Create database
  - Modo: **Native** (no Datastore)
  - Región: **us-central1** (misma que la Function)
  - Reglas iniciales: modo producción (denegar todo por defecto — el Admin SDK las bypasa)

- [ ] **0.3 Habilitar Firebase Authentication**
  - Firebase Console → Build → Authentication → Get started
  - Activar proveedor **Google**
  - Activar proveedor **Email/Password**

- [ ] **0.4 Agregar dominios autorizados en Auth**
  - Firebase Console → Authentication → Settings → Authorized domains
  - Agregar: `invoicer-6a7c2.web.app`
  - Agregar: `invoicer-6a7c2.firebaseapp.com`
  - (localhost ya está por defecto)

---

### FASE 1 — Configurar Firebase Hosting en `firebase.json`

- [ ] **1.1** Agregar sección `hosting` a `firebase.json`
  ```json
  "hosting": {
    "public": "app/www",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [{ "key": "Cache-Control", "value": "max-age=31536000" }]
      }
    ]
  }
  ```
  El rewrite `** → /index.html` es esencial para que Angular Router funcione en URLs directas y al refrescar.

---

### FASE 2 — Variables de entorno de la Function para producción

La Function lee `process.env['ALLOWED_ORIGINS']` para la lista CORS. En producción debe incluir el dominio de Hosting.

- [ ] **2.1** Crear `functions/.env.prod` (archivo local, gitignoreado)
  ```
  APP_ENV=prod
  ALLOWED_ORIGINS=https://invoicer-6a7c2.web.app,https://invoicer-6a7c2.firebaseapp.com
  ```
  Firebase Functions v2 carga automáticamente `.env.{project-alias}` al hacer `firebase deploy --project invoicer-6a7c2` usando el alias `prod`.

> **Nota:** `.env.prod` ya está en `.gitignore` — este archivo existe solo localmente y nunca va al repo.

---

### FASE 3 — Tests previos al deploy

Nunca deployar sin que los tests pasen.

- [ ] **3.1** Ejecutar suite completa de tests del backend
  ```bash
  cd functions && npm test
  ```
  Resultado esperado: **45 tests passed** (4 suites: invoices, clients, auth-middleware, profile)

---

### FASE 4 — Build de artefactos

- [ ] **4.1** Build TypeScript → JavaScript (Functions)
  ```bash
  cd functions && npm run build
  ```
  Verifica que `functions/lib/` se genere sin errores TypeScript.

- [ ] **4.2** Build Angular → producción (Hosting)
  ```bash
  cd app && npm run build:prod
  ```
  Verifica que `app/www/` se genere. La configuración `production` usa `environment.prod.ts` con las URLs de `invoicer-6a7c2`.

  > Si hay budget warnings por tamaño de bundle, ajustar los límites en `angular.json` o ignorar advertencias (no son errores).

---

### FASE 5 — Deploy Functions a producción

- [ ] **5.1** Seleccionar proyecto prod
  ```bash
  firebase use prod
  ```

- [ ] **5.2** Deploy solo Functions
  ```bash
  firebase deploy --only functions
  ```
  Tiempo estimado: 2-5 minutos. Firebase compila en la nube desde `functions/lib/`.

- [ ] **5.3** Verificar el endpoint de health
  ```bash
  curl https://us-central1-invoicer-6a7c2.cloudfunctions.net/api/health
  ```
  Respuesta esperada: `{ "status": "ok", "env": "prod", "timestamp": "..." }`

---

### FASE 6 — Deploy Hosting a producción

- [ ] **6.1** Deploy solo Hosting
  ```bash
  firebase deploy --only hosting
  ```

- [ ] **6.2** Verificar que la app carga en el browser
  - Abrir: `https://invoicer-6a7c2.web.app`
  - Debe mostrar la pantalla de Login

- [ ] **6.3** Verificar deep-link / refresh de ruta
  - Navegar a `https://invoicer-6a7c2.web.app/dashboard` directamente
  - Debe redirigir a Login (por el guard) — no mostrar 404

---

### FASE 7 — Smoke tests funcionales post-deploy

Pruebas manuales del flujo completo en producción.

- [ ] **7.1** Registro con email/password
  - Crear cuenta nueva → debe entrar al dashboard vacío

- [ ] **7.2** Login con Google
  - Cerrar sesión → Login con Google → dashboard

- [ ] **7.3** Crear factura
  - Editor → guardar → preview → verificar todos los datos

- [ ] **7.4** Crear cliente
  - Clientes → nueva → guardar → aparece en la lista

- [ ] **7.5** Guardar perfil
  - Perfil → completar datos → guardar → recargar → datos persisten

- [ ] **7.6** Aislamiento de datos
  - Con una cuenta, los datos de otra cuenta NO aparecen

- [ ] **7.7** Verificar CORS
  - Abrir DevTools → Network → ninguna petición a la Function debe tener error CORS

---

### FASE 8 — Commit de los cambios de configuración

- [ ] **8.1** Commit de `firebase.json` actualizado
  ```bash
  git add firebase.json
  git commit -m "feat: add Firebase Hosting config for SPA deploy"
  git push
  ```

---

## Archivos a modificar

| Acción | Archivo | Detalle |
|--------|---------|---------|
| MODIFICAR | `firebase.json` | Agregar sección `hosting` |
| CREAR (local) | `functions/.env.prod` | `ALLOWED_ORIGINS` con dominios de Hosting — NO va al repo |

---

## Comandos de deploy en orden

```bash
# 1. Tests
cd /Volumes/.../invoicer-2/functions && npm test

# 2. Builds
npm run build                                    # TypeScript
cd ../app && npm run build:prod                  # Angular

# 3. Seleccionar proyecto y deployar
cd ..
firebase use prod
firebase deploy --only functions
firebase deploy --only hosting

# 4. Smoke test health
curl https://us-central1-invoicer-6a7c2.cloudfunctions.net/api/health
```

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|-----------|
| Billing no activado → Functions fallan | Alta | FASE 0.1 es el primer paso bloqueante |
| CORS error en producción | Media | `.env.prod` con dominios correctos en FASE 2 |
| Angular bundle excede budget | Media | Ajustar `maximumError` en `angular.json` si falla |
| Firestore rules bloquean el Admin SDK | Baja | El Admin SDK bypasa las security rules por diseño |
| Auth Google falla por dominio no autorizado | Media | FASE 0.4 agrega los dominios de Hosting |
| `functions/lib/` sin generar antes del deploy | Alta | FASE 4.1 obligatoria antes de 5.2 |

---

## URLs de producción (tras deploy exitoso)

| Recurso | URL |
|---------|-----|
| Web app | `https://invoicer-6a7c2.web.app` |
| API Functions | `https://us-central1-invoicer-6a7c2.cloudfunctions.net/api` |
| Health check | `https://us-central1-invoicer-6a7c2.cloudfunctions.net/api/health` |
| Firebase Console | `https://console.firebase.google.com/project/invoicer-6a7c2` |
