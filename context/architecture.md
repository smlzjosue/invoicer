# FacturaFácil — Arquitectura del Sistema

## Flujo de Datos

```
Usuario (browser)
    │
    ▼
┌─────────────────────────────────┐
│   Ionic / Angular App (app/)    │
│                                 │
│  LoginPage ──► AuthService      │
│                   │             │
│                   ▼             │
│          Firebase Auth (Google) │
│                                 │
│  DashboardPage ─┐               │
│  EditorPage    ─┤► InvoiceService (HttpClient)
│  PreviewPage   ─┘               │
└─────────────────────────────────┘
                  │
                  │ HTTP REST (JSON)
                  ▼
┌─────────────────────────────────┐
│  Firebase Cloud Function (api)  │
│  functions/src/index.ts         │
│                                 │
│  Express App (app.ts)           │
│  ├── /health  (GET)             │
│  └── /invoices (CRUD)           │
│       └── invoicesRouter        │
│            └── validate.ts      │
└─────────────────────────────────┘
                  │
                  │ Firebase Admin SDK
                  ▼
┌─────────────────────────────────┐
│         Firestore DB            │
│  Collection: invoices           │
│  (sin security rules — Admin)   │
└─────────────────────────────────┘
```

## Decisiones de Arquitectura Clave

### ¿Por qué Express dentro de Cloud Functions?
Cloud Functions v2 con `onRequest` acepta cualquier Express app. Esto permite tener un router completo (CRUD), middleware de validación, y tests con Supertest sin levantar el emulador.

### ¿Por qué Admin SDK en el backend?
El Admin SDK bypassa las Firestore Security Rules. Evita el problema de tener que configurar reglas en el emulador local. Toda la autorización es responsabilidad del backend.

### ¿Por qué HttpClient en el frontend (no Firestore SDK directo)?
AngularFire 20 + Firebase 11 tienen un bug de injection context que hace que `collectionData`, `addDoc` etc. fallen fuera del contexto de inyección de Angular. Se decidió usar una API REST intermedia para evitar ese problema.

### ¿Por qué Firebase SDK crudo (no AngularFire) para Auth?
AngularFire wrappers internamente usan `inject()` que requiere contexto de inyección. El SDK crudo (`firebase/auth`) funciona directamente en el constructor del servicio.

### ¿Por qué NgModule y no standalone components?
Angular 19 genera componentes standalone por defecto, pero Ionic usa un patrón NgModule maduro. Al mezclar ambos hay problemas con IonicModule. Se mantiene `standalone: false` en todos los componentes.

## Estructura de Directorios

```
invoicer-2/
├── .firebaserc                    ← aliases: default/dev/qa/prod
├── firebase.json                  ← emulator config (ports 5001, 8080, 4000)
├── .gitignore
│
├── functions/                     ← Firebase Cloud Functions (Node 20)
│   ├── src/
│   │   ├── index.ts               ← entrypoint: initializeApp + onRequest
│   │   ├── app.ts                 ← Express app + CORS + /health
│   │   ├── routes/
│   │   │   └── invoices.ts        ← 5 endpoints CRUD
│   │   ├── middleware/
│   │   │   └── validate.ts        ← validación de payload
│   │   └── models/
│   │       └── invoice.model.ts   ← tipos TypeScript (CreateInvoiceDto)
│   ├── tests/
│   │   ├── invoices.test.ts       ← 12 tests (mock en memoria)
│   │   └── setup.ts
│   ├── .env.dev / .env.qa / .env.prod  ← secretos por ambiente (en .gitignore)
│   └── .env.example
│
├── app/                           ← Ionic Angular App
│   └── src/
│       ├── environments/
│       │   ├── environment.ts      ← DEV → localhost:5001
│       │   ├── environment.qa.ts   ← QA → invoicer-qa (claves pendientes)
│       │   └── environment.prod.ts ← PROD → invoicer-6a7c2
│       └── app/
│           ├── app.module.ts       ← NgModule raíz (HttpClientModule, IonicModule)
│           ├── app-routing.module.ts ← rutas + authGuard
│           ├── guards/
│           │   └── auth.guard.ts   ← protege dashboard/editor/preview
│           ├── services/
│           │   ├── auth.service.ts ← Firebase Auth (Google Sign-In, signOut)
│           │   └── invoice.service.ts ← HttpClient CRUD + helpers
│           ├── models/
│           │   └── invoice.model.ts
│           └── pages/
│               ├── login/          ← LoginPage (Google button)
│               ├── dashboard/      ← lista de facturas + logout
│               ├── editor/         ← formulario create/edit (ReactiveForm)
│               └── preview/        ← vista previa imprimible
│
├── context/                       ← Documentación del proyecto
└── work-plans/                    ← Planes de trabajo ejecutados
```
