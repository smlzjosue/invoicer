# FacturaFácil — Problemas Conocidos y Soluciones

## Resueltos

### PERMISSION_DENIED al escribir en Firestore (emulador)
**Síntoma:** `Error: 7 PERMISSION_DENIED: Missing or insufficient permissions` en el log del emulador.
**Causa:** El Firebase Admin SDK necesita credenciales OAuth aunque llame al emulador local.
**Solución:** `gcloud auth application-default login` (una vez por máquina).

### CONFIGURATION_NOT_FOUND al intentar login con Google
**Síntoma:** Firebase Auth devuelve `CONFIGURATION_NOT_FOUND`.
**Causa:** Firebase Authentication no está habilitado en el proyecto Firebase.
**Solución:** Firebase Console → Authentication → Get started → Sign-in method → Google → Enable.

### AngularFire injection context error
**Síntoma:** `Firebase API called outside injection context: collectionData`
**Causa:** AngularFire 20 wrappers usan `inject()` internamente, incompatible con Angular 19 fuera del contexto DI.
**Solución:** Usar SDK crudo de Firebase (`firebase/firestore`, `firebase/auth`) o HttpClient. **No usar** `@angular/fire/firestore` wrappers como `collectionData`, `addDoc`.

### NG6008: Component is standalone, cannot be declared in NgModule
**Síntoma:** Error de compilación al agregar un componente al módulo.
**Causa:** Angular 19 genera `standalone: true` por defecto.
**Solución:** Agregar `standalone: false` explícitamente en el decorador `@Component` de todas las páginas.

### Jest picks up macOS metadata files (`._invoices.test.ts`)
**Síntoma:** Jest intenta correr `._invoices.test.ts` y falla.
**Causa:** macOS crea archivos `._*` en directorios copiados.
**Solución:** En `jest.config` → `testPathIgnorePatterns: ["\\._"]` ya configurado.

### CSS budget exceeded en angular.json
**Síntoma:** Build falla con "Bundle budget exceeded" para preview.page.scss.
**Solución:** Aumentar `anyComponentStyle` budget en `angular.json` de 2kb a 4kb.

---

## Pendientes / Conocidos

### Google Auth no funciona en `localhost` sin dominio autorizado
**Síntoma:** Error `auth/unauthorized-domain` al intentar login.
**Solución:** Firebase Console → Authentication → Sign-in method → Authorized domains → agregar `localhost`.

### Deploy a Cloud Functions requiere plan Blaze
**Síntoma:** `Error: HTTP Error: 400, Billing account for project ... is not found`.
**Solución:** Activar plan Blaze en Firebase Console para los proyectos `invoicer-qa` e `invoicer-6a7c2`.

### `environment.qa.ts` tiene placeholders
**Síntoma:** Build QA funciona pero apunta a claves falsas (`REPLACE_WITH_QA_API_KEY`).
**Solución:** Crear proyecto `invoicer-qa` en Firebase Console y reemplazar los valores en `app/src/environments/environment.qa.ts`.
