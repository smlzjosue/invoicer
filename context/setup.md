# FacturaFácil — Setup y Comandos

## Requisitos previos (una sola vez por máquina)

```bash
# 1. Node 20
node --version  # debe ser 20.x

# 2. Firebase CLI
npm install -g firebase-tools
firebase login

# 3. Google Cloud SDK (para credenciales locales del Admin SDK)
brew install --cask google-cloud-sdk  # o instalar manualmente
gcloud auth application-default login
# → Abre browser, autenticarse con la misma cuenta de Firebase
```

## Desarrollo local (DEV)

```bash
# Terminal 1 — Firebase emulators (Functions :5001, Firestore :8080, UI :4000)
cd functions
npm run serve:local

# Terminal 2 — Ionic app
cd app
npm run start:dev
# → http://localhost:8100
```

### Requisito para que el emulador funcione:
El Firebase Admin SDK necesita credenciales aunque llame al emulador local.
`gcloud auth application-default login` resuelve esto de forma permanente.

## Tests del backend

```bash
cd functions
npm test          # 12 tests, ~3.6s, sin emulador ni credenciales
npm run test:watch
```

## Build por ambiente

```bash
# App Angular
cd app
npm run build:dev   # → environment.ts (localhost)
npm run build:qa    # → environment.qa.ts (invoicer-qa)
npm run build:prod  # → environment.prod.ts (invoicer-6a7c2)

# Functions TypeScript
cd functions
npm run build       # tsc
```

## Deploy por ambiente

```bash
cd functions

npm run deploy:dev   # firebase use dev  → invoicer-dev
npm run deploy:qa    # firebase use qa   → invoicer-qa (requiere Blaze)
npm run deploy:prod  # firebase use prod → invoicer-6a7c2 (requiere Blaze)
```

## Smoke tests (verificar que el deploy está vivo)

```bash
cd functions
npm run smoke:qa    # llama https://us-central1-invoicer-qa.cloudfunctions.net/api/health
npm run smoke:prod  # llama https://us-central1-invoicer-6a7c2.cloudfunctions.net/api/health
```

## Cambiar de proyecto Firebase activo

```bash
firebase use dev    # → invoicer-dev
firebase use qa     # → invoicer-qa
firebase use prod   # → invoicer-6a7c2
firebase use        # ver cuál está activo
```

## Variables de entorno (Functions)

Archivos en `functions/` — ignorados por git:
- `.env.dev` — para `firebase use dev`
- `.env.qa` — para `firebase use qa`
- `.env.prod` — para `firebase use prod`
- `.env.example` — plantilla documentada

Copiar `.env.example` y editar los valores para cada ambiente.

## Firebase Console — configuración necesaria

Para cada proyecto (invoicer-dev, invoicer-qa, invoicer-6a7c2):
1. Habilitar **Firestore** (modo test para dev/qa)
2. Habilitar **Authentication** → proveedor **Google**
3. En "Dominios autorizados" de Auth → agregar `localhost` (si no está)
4. Para Functions → plan **Blaze** requerido en qa y prod

## Proyectos Firebase

| Alias | Project ID | Estado |
|-------|-----------|--------|
| `dev` | `invoicer-dev` | ⏳ Por crear |
| `qa` | `invoicer-qa` | ⏳ Por crear |
| `prod` | `invoicer-6a7c2` | ✅ Existe (Blaze pendiente) |
