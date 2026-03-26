# FacturaFácil — Frontend (Ionic + Angular)

## Reglas importantes del proyecto Angular

1. **SIEMPRE usar `standalone: false`** en todos los componentes/páginas — el proyecto usa NgModule, no standalone components. Angular 19 genera `standalone: true` por defecto, hay que cambiarlo.
2. **NO usar AngularFire wrappers** (`collectionData`, `addDoc`, etc.) — tienen bugs de injection context en Angular 19 + AngularFire 20. Usar el SDK crudo de Firebase o HttpClient.
3. **Ionic requiere `NgModule` con `IonicModule.forRoot()`** — no mezclar con standalone module approach.

## Rutas

| Ruta | Componente | Guard |
|------|-----------|-------|
| `/` | → redirect a `/dashboard` | — |
| `/login` | `LoginPage` | — |
| `/dashboard` | `DashboardPage` | `authGuard` |
| `/editor/:id` | `EditorPage` | `authGuard` |
| `/preview/:id` | `PreviewPage` | `authGuard` |

El `:id` en editor es `'new'` para creación o el ID de Firestore para edición.

## Páginas

### LoginPage (`pages/login/`)
- Inicializa Firebase App si no existe
- Botón "Continuar con Google" → `signInWithPopup`
- En éxito → navega a `/dashboard`
- En error → muestra toast con el mensaje

### DashboardPage (`pages/dashboard/`)
- Lista todas las facturas via `InvoiceService.getAll()` (Observable)
- Segmentos: Todas / Pendiente / Pagada / Borrador
- Desktop: tabla (`ion-grid`)
- Mobile: lista deslizable (`ion-item-sliding`) con opciones de vista y borrado
- FAB para crear nueva factura
- Botón de logout en el header

### EditorPage (`pages/editor/`)
- `ReactiveForm` (`FormBuilder`)
- `FormArray` para los ítems de la factura
- Recalcula totales en tiempo real cuando cambian `items` o `taxRate`
- En save → `create()` o `update()` según si `invoiceId === null`
- Tras guardar → navega a `/preview/:id`
- **`dueDate`** usa `ion-datetime` dentro de `ion-modal` (NO `ion-input[type=date]`):
  - El campo trigger es un `ion-item button` que abre el modal al click
  - `ion-datetime` tiene `min` = fecha de hoy (no se pueden seleccionar fechas pasadas)
  - Botones en slot `buttons`: Cancelar / **Hoy** (setea hoy y cierra) / Confirmar
  - El valor se guarda en el form solo al confirmar (patrón `tempDueDate` → commit)
- **Auto-fill del emisor (`from`):** en facturas nuevas, `ngOnInit` lee `UserProfileService.getProfile()` y parchea el grupo `from` con `companyName → name`, `email`, `phone`, `address`. No aplica en modo edición.

### AboutPage (`pages/about/`)
- Página de solo lectura, sin servicios inyectados
- Muestra: nombre de la app, versión leída de `environment.appVersion`, ambiente (`environment.envName`)
- Card central con avatar, nombre del desarrollador ("Ing. Samuel Lozada")
- Lista de contacto con 4 links clickeables: portal web (`target="_blank"`), teléfono (`tel:`), email (`mailto:`), LinkedIn (`target="_blank"`)
- Año de copyright dinámico: `new Date().getFullYear()`
- Accesible desde `/about`, nav item "Acerca de" en el footer del sidebar

### ProfilePage (`pages/profile/`)
- Formulario: Nombre/Empresa (required), Email (required), Teléfono, Dirección
- `ngOnInit`: si hay perfil en `localStorage` → parchea el form; si no → pre-llena email de Firebase Auth
- `save()` → `UserProfileService.saveProfile()` → toast de éxito
- Banner informativo: "Estos datos se usarán como emisor en tus nuevas facturas"
- Accesible desde `/profile`, nav item "Mi Perfil" en footer del sidebar

### ClientsPage (`pages/clients/`)
- Lista de clientes con `ion-item-sliding` (swipe derecho: Editar / Eliminar)
- `ion-searchbar` filtra en tiempo real por nombre, email o teléfono (pipe `map` en `filteredClients$`)
- `ion-fab` en la esquina inferior derecha → abre modal de creación
- **Modal create/edit** controlado por `clientModalOpen` + `editingClient`:
  - Campos: Nombre (required), Email (required), Teléfono, Dirección
  - `saveClient()` llama `create()` o `update()` según `editingClient`
  - Eliminar vía `AlertController` con confirmación
- `standalone: false`, usa `FormsModule` + `ReactiveFormsModule` + `IonicModule`

### PreviewPage (`pages/preview/`)
- Lee la factura por ID via `InvoiceService.getById()`
- Vista de solo lectura, diseño tipo documento imprimible
- Botón para imprimir (`window.print()`)
- Botones: Editar → `/editor/:id`, Volver → `/dashboard`

### UserProfileService (`services/user-profile.service.ts`)
```typescript
// localStorage key: 'invoicer_user_profile'
getProfile(): UserProfile | null
saveProfile(profile: UserProfile): void
hasProfile(): boolean
```

### ClientService (`services/client.service.ts`)
```typescript
baseUrl = environment.clientsUrl  // incluye /clients al final

getAll(): Observable<Client[]>
getById(id: string): Observable<Client>
create(client): Promise<string>   // retorna el ID
update(id, client): Promise<void>
delete(id): Promise<void>
```

## Servicios

### AuthService (`services/auth.service.ts`)
```typescript
// Inicialización
initializeApp(environment.firebase)  // Solo si no hay app ya inicializada

// Métodos públicos
signInWithGoogle(): Promise<void>    // popup → navega a /dashboard
signOut(): Promise<void>             // navega a /login
getInitialUser(): Promise<User|null> // para el guard (espera primer onAuthStateChanged)

// Observable
user$: Observable<User|null|undefined>
// undefined = cargando, null = no autenticado, User = autenticado
```

### InvoiceService (`services/invoice.service.ts`)
```typescript
// Lee de environment.apiUrl
baseUrl = environment.apiUrl  // incluye /invoices al final

getAll(): Observable<Invoice[]>
getById(id: string): Observable<Invoice>
create(invoice): Promise<string>     // retorna el ID
update(id, invoice): Promise<void>
delete(id): Promise<void>
generateInvoiceNumber(): string      // "INV-YYYYMM-XXXX"
calculateTotals(items, taxRate): { subtotal, taxAmount, total }
```

### AuthGuard (`guards/auth.guard.ts`)
```typescript
// Funcional (CanActivateFn)
// Usa getInitialUser() para esperar el primer estado de Firebase Auth
// Si autenticado → permite
// Si no → redirige a /login
```

## AppModule

```typescript
imports: [
  BrowserModule,
  HttpClientModule,   // para InvoiceService
  IonicModule.forRoot(),
  AppRoutingModule,
]
// Sin AngularFire providers — Firebase se inicializa en AuthService
```

## Environments

| Archivo | Ambiente | appVersion | apiUrl apunta a |
|---------|---------|-----------|----------------|
| `environment.ts` | DEV | `1.0.0` | `localhost:5001/invoicer-dev/...` |
| `environment.qa.ts` | QA | `1.0.0` | `us-central1-invoicer-qa.cloudfunctions.net/...` |
| `environment.prod.ts` | PROD | `1.0.0` | `us-central1-invoicer-6a7c2.cloudfunctions.net/...` |

Los tres archivos tienen la misma estructura: `{ production, envName, appVersion, apiUrl, clientsUrl, firebase: {...} }`
