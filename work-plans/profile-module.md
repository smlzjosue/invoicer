# Plan: Módulo de Perfil de Usuario
**Fecha:** 2026-03-25
**Scope:** Frontend únicamente — sin cambios en el backend

---

## Contexto y análisis previo

### Qué ya existe en AuthService
El `AuthService` actual expone:
- `currentUser: User | null | undefined` — objeto Firebase Auth (`displayName`, `email`, `photoURL`, `phoneNumber`)
- `getUserDisplayName()` — retorna `displayName || email || 'Usuario'`
- Soporta Google Sign-In, Apple Sign-In y Email/Password

### El problema
Firebase Auth guarda datos de **autenticación** (`displayName`, `email`), no datos de **empresa** (nombre de la empresa, dirección, teléfono de negocio). El campo `from` de una factura necesita datos que Firebase no almacena.

### Decisión de almacenamiento: `localStorage`
| Opción | Por qué se descartó |
|--------|-------------------|
| Firestore vía API nueva | Requiere auth middleware en el backend — el backend actual NO valida tokens. Agregar eso es un cambio de arquitectura grande. |
| Firestore directo (SDK) | AngularFire tiene bugs de injection context en este proyecto. Ya documentado en `known-issues.md`. |
| **`localStorage`** | ✅ Cero backend, persistente entre sesiones, síncrono, zero-config. Para datos de "mi empresa" que se llenan una vez y raramente cambian es la opción correcta. |

Si en el futuro se requiere sincronización multi-dispositivo, se migra a Firestore con el endpoint `/profile` — el `UserProfileService` es el único punto a cambiar.

---

## Modelo de datos del Perfil

```typescript
interface UserProfile {
  companyName: string;  // → from.name en facturas
  email: string;        // → from.email
  phone: string;        // → from.phone
  address: string;      // → from.address
}
```

**localStorage key:** `'invoicer_user_profile'`

---

## Decisiones de UX

| Decisión | Elección | Razón |
|----------|---------|-------|
| Ubicación del acceso al perfil | Nav item "Mi Perfil" en el footer del sidebar (sobre "Cerrar Sesión") | Siempre visible, fácil de encontrar |
| Sidebar header | Mostrar nombre de empresa (del perfil) o displayName de Auth + email debajo, clickeable a `/profile` | UX estándar de apps SaaS — el usuario sabe quién está logueado |
| Auto-fill en factura | Solo en facturas NUEVAS (`isNew === true`), no en edición | No pisar datos ya guardados de una factura existente |
| Pre-fill inicial del perfil | Email de `AuthService.currentUser.email` si no hay perfil guardado | Facilita el primer setup |

---

## Checklist de implementación

---

### Bloque 1 — Modelo y UserProfileService

#### Fase 1.1 — Modelo
**Archivo nuevo:** `app/src/app/models/user-profile.model.ts`

- [ ] Definir interfaz `UserProfile`:
  ```typescript
  export interface UserProfile {
    companyName: string;
    email: string;
    phone: string;
    address: string;
  }
  ```

#### Fase 1.2 — UserProfileService
**Archivo nuevo:** `app/src/app/services/user-profile.service.ts`

- [ ] `@Injectable({ providedIn: 'root' })`
- [ ] Constante privada `STORAGE_KEY = 'invoicer_user_profile'`
- [ ] `getProfile(): UserProfile | null` — lee y parsea desde `localStorage`; retorna `null` si no existe o si el JSON es inválido (try/catch)
- [ ] `saveProfile(profile: UserProfile): void` — serializa y guarda en `localStorage`
- [ ] `hasProfile(): boolean` — retorna `!!this.getProfile()`

---

### Bloque 2 — ProfilePage

#### Fase 2.1 — Estructura de archivos
**Archivos nuevos en `app/src/app/pages/profile/`:**

- [ ] `profile-routing.module.ts`
- [ ] `profile.module.ts` — `NgModule` con `CommonModule`, `ReactiveFormsModule`, `IonicModule`, `ProfilePageRoutingModule`
- [ ] `profile.page.ts`
- [ ] `profile.page.html`
- [ ] `profile.page.scss`

#### Fase 2.2 — `profile.page.ts` (lógica)

- [ ] Inyectar `UserProfileService`, `AuthService`, `ToastController`, `FormBuilder`
- [ ] Propiedad `form: FormGroup` con campos: `companyName` (required), `email` (required, email), `phone`, `address`
- [ ] `ngOnInit()`:
  - Si `UserProfileService.getProfile()` existe → `form.patchValue(profile)`
  - Si no → pre-fill solo `email` con `AuthService.currentUser?.email ?? ''`
- [ ] Método `save()`:
  - Si `form.invalid` → `markAllAsTouched()` y retorna
  - `UserProfileService.saveProfile(form.value)`
  - Muestra toast "Perfil guardado"
- [ ] Getter `hasUnsavedChanges(): boolean` — (opcional) `form.dirty` para poder mostrar aviso si sale sin guardar

#### Fase 2.3 — `profile.page.html` (template)

- [ ] `ion-header` con título "Mi Perfil" + botón hamburger `ion-menu-button`
- [ ] `ion-content` con formulario `[formGroup]="form"`:
  - Sección "Datos de tu empresa" (subtítulo con `ion-list-header`)
  - `ion-input` Nombre / Empresa (required) — error si invalid+touched
  - `ion-input` Email (required, type=email) — error si invalid+touched
  - `ion-input` Teléfono (type=tel)
  - `ion-textarea` Dirección ([rows]=3)
- [ ] Banner informativo (`ion-card` o `ion-note` color=primary) explicando: "Estos datos se usarán automáticamente como emisor en tus nuevas facturas"
- [ ] `ion-button` expand="block" color="primary" `(click)="save()"` — "Guardar perfil"

#### Fase 2.4 — `profile.page.scss` (estilos)

- [ ] Estilos mínimos: padding de la sección, estilo del banner informativo

---

### Bloque 3 — Navegación

#### Fase 3.1 — Shell routing
**Archivo modificado:** `app/src/app/shell/shell-routing.module.ts`

- [ ] Agregar ruta `profile`:
  ```typescript
  {
    path: 'profile',
    loadChildren: () =>
      import('../pages/profile/profile.module').then((m) => m.ProfilePageModule),
  }
  ```

#### Fase 3.2 — Sidebar: mostrar usuario
**Archivos modificados:** `shell.component.html` + `shell.component.ts`

- [ ] En `shell.component.ts` — exponer datos:
  - Getter `userName`: retorna `profile.companyName` si existe, si no `authService.getUserDisplayName()`
  - Getter `userEmail`: retorna `authService.currentUser?.email ?? ''`
  - Inyectar `UserProfileService`

- [ ] En `shell.component.html` — reemplazar el brand header actual (`sidebar-brand`) por un bloque de usuario:
  ```html
  <!-- Brand -->
  <div class="sidebar-brand">
    <ion-icon name="receipt-outline" class="brand-icon"></ion-icon>
    <span class="brand-name">Invoicer</span>
  </div>
  <!-- Separador -->
  <div class="user-info" (click)="goToProfile()">
    <div class="user-avatar">{{ userName.charAt(0).toUpperCase() }}</div>
    <div class="user-details">
      <span class="user-name">{{ userName }}</span>
      <span class="user-email">{{ userEmail }}</span>
    </div>
    <ion-icon name="chevron-forward-outline" class="user-chevron"></ion-icon>
  </div>
  ```
  > Nota: el bloque original de `sidebar-brand` se mantiene arriba; el bloque `user-info` se agrega debajo, separado por un divisor visual.

- [ ] En `shell.component.ts` — agregar método `goToProfile()` (navega a `/profile` y cierra el menú)
- [ ] Inyectar `Router` en `ShellComponent`

#### Fase 3.3 — Sidebar: nav item "Mi Perfil"

- [ ] Agregar en el footer del sidebar, **sobre** "Cerrar Sesión":
  ```html
  <ion-item button class="nav-item" routerLink="/profile" routerLinkActive="nav-active" (click)="closeMenu()">
    <ion-icon name="person-outline" slot="start"></ion-icon>
    <ion-label>Mi Perfil</ion-label>
  </ion-item>
  ```

#### Fase 3.4 — Estilos del bloque usuario en `shell.component.scss`

- [ ] `.user-info` — layout flex, clickeable con cursor pointer, padding, borde superior sutil
- [ ] `.user-avatar` — círculo con inicial (color blanco semitransparente sobre fondo primario)
- [ ] `.user-name` — texto blanco bold, font pequeño
- [ ] `.user-email` — texto blanco semitransparente, font más pequeño
- [ ] `.user-chevron` — icono pequeño alineado a la derecha

---

### Bloque 4 — Auto-fill del perfil en el formulario de factura

**Archivo modificado:** `app/src/app/pages/editor/editor.page.ts`

- [ ] Inyectar `UserProfileService` en el constructor del `EditorPage`
- [ ] En `ngOnInit()`, en el bloque `else` (cuando es factura nueva, id === 'new' o no hay id):
  ```typescript
  const profile = this.userProfileService.getProfile();
  if (profile) {
    this.form.get('from')!.patchValue({
      name: profile.companyName,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
    });
  }
  ```
- [ ] Verificar que el auto-fill NO ocurre cuando `isNew === false` (modo edición) — el `patchValue` de `loadInvoice()` sobreescribirá correctamente los datos guardados

---

### Bloque 5 — Tests

**Backend:** No hay cambios en `functions/` → los 24 tests existentes siguen sin tocarse.

**Frontend:** No hay framework de tests de Angular/Ionic configurado → no aplica.

- [ ] **5.1** Confirmar que `npm test` en `functions/` sigue pasando 24/24 (regresión rápida)

---

### Bloque 6 — Smoke tests manuales

- [ ] **6.1** Navegar a `/profile` desde el sidenav → página carga con formulario vacío (o con email pre-llenado de Auth)
- [ ] **6.2** Llenar todos los campos → Guardar → toast "Perfil guardado" aparece
- [ ] **6.3** Salir y regresar a `/profile` → datos persisten (localStorage)
- [ ] **6.4** El sidebar muestra el nombre de empresa (del perfil) en el bloque de usuario
- [ ] **6.5** El sidebar muestra el email del usuario
- [ ] **6.6** Click en el bloque de usuario del sidebar → navega a `/profile`
- [ ] **6.7** Ir a `/editor/new` → sección "De" tiene los campos pre-llenados con los datos del perfil
- [ ] **6.8** Ir a `/editor/:id` (edición) → sección "De" muestra los datos guardados de la factura, NO los del perfil
- [ ] **6.9** Editar el perfil y guardar → crear nueva factura → los campos "De" reflejan el perfil actualizado
- [ ] **6.10** "Mi Perfil" en el sidebar tiene `routerLinkActive` activo cuando se está en `/profile`
- [ ] **6.11** Primer uso (sin perfil guardado): crear factura → sección "De" vacía (no rompe el formulario)

---

### Bloque 7 — Documentación

- [ ] **7.1** Actualizar `context/frontend.md` — agregar `ProfilePage`, `UserProfileService`, nota de auto-fill en EditorPage
- [ ] **7.2** Actualizar `context/data-model.md` — agregar modelo `UserProfile` y nota de localStorage
- [ ] **7.3** Actualizar `context/overview.md` — agregar módulo Perfil en tabla de estado

---

## Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `app/src/app/models/user-profile.model.ts` | Interfaz `UserProfile` |
| `app/src/app/services/user-profile.service.ts` | CRUD en localStorage |
| `app/src/app/pages/profile/profile-routing.module.ts` | Routing del módulo |
| `app/src/app/pages/profile/profile.module.ts` | NgModule |
| `app/src/app/pages/profile/profile.page.ts` | Lógica del formulario |
| `app/src/app/pages/profile/profile.page.html` | Template |
| `app/src/app/pages/profile/profile.page.scss` | Estilos mínimos |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `app/src/app/shell/shell-routing.module.ts` | Ruta `/profile` |
| `app/src/app/shell/shell.component.ts` | Getters userName/userEmail + goToProfile() |
| `app/src/app/shell/shell.component.html` | Bloque usuario + nav item "Mi Perfil" |
| `app/src/app/shell/shell.component.scss` | Estilos del bloque usuario |
| `app/src/app/pages/editor/editor.page.ts` | Auto-fill from.* con datos del perfil |
| `context/frontend.md` | Docs |
| `context/data-model.md` | Docs |
| `context/overview.md` | Docs |

**No se modifica nada en `functions/`.**

---

## Orden de ejecución

```
Bloque 1 (modelo + service) → Bloque 2 (ProfilePage) → Bloque 3 (navegación)
→ Bloque 4 (auto-fill editor) → Bloque 5 (regresión tests) → Bloque 6 (smoke) → Bloque 7 (docs)
```
