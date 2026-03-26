# Plan: Módulo de Clientes + Teléfono en Facturas
**Fecha:** 2026-03-25
**Scope:** Backend (functions/) + Frontend (app/) + Integración con el formulario de factura

---

## Resumen del impacto

| Área | Cambio |
|------|--------|
| Backend — modelo | `phone?` en `from`/`to` de Invoice; nuevo modelo `Client` |
| Backend — API | Nuevo router `/clients` (5 endpoints CRUD) |
| Backend — tests | Nuevo archivo `clients.test.ts` (~10 tests) |
| Frontend — modelos | `phone?` en Invoice; nueva interfaz `Client` |
| Frontend — service | Nuevo `ClientService` (HttpClient CRUD) |
| Frontend — environments | Agregar `clientsUrl` en los 3 archivos de ambiente |
| Frontend — páginas | Nueva página `ClientsPage` (lista + modal create/edit) |
| Frontend — editor | Campos `phone` en "De" y "Cobrar a"; selector de cliente en "Cobrar a" |
| Frontend — navegación | Ruta `/clients` en Shell + entrada en sidenav |

---

## Decisiones de arquitectura

### ¿Por qué `phone` es opcional (`phone?`)?
Las facturas existentes en Firestore no tienen teléfono. Hacerlo opcional evita romper `validateInvoice` del backend ni las facturas guardadas. El frontend tampoco exigirá `Validators.required` en ese campo.

### ¿CRUD de clientes en una sola página o en páginas separadas?
**Modal inline dentro de `ClientsPage`** — el formulario de cliente tiene solo 4 campos (nombre, email, teléfono, dirección). No justifica una ruta nueva. El `ion-modal` controlado por el componente es el patrón Ionic idiomático para formularios simples, como ya se usó en el date picker.

### ¿Cómo agregar `clientsUrl` sin romper InvoiceService?
`environment.apiUrl` apunta a `.../api/invoices` y `InvoiceService` lo usa tal cual. Se agrega `clientsUrl` apuntando a `.../api/clients` en los 3 ambientes. **No se toca `apiUrl` ni `InvoiceService`** — zero-risk.

### ¿Dónde vive el selector de clientes en el formulario de factura?
Botón "Seleccionar cliente" dentro del bloque "Cobrar a" de `editor.page.html`. Al tocar abre un `ion-modal` con lista de clientes + buscador. Al seleccionar → `form.get('to').patchValue({name, email, phone, address})` + cerrar modal. El campo "De" (emisor) **no** tendrá selector de cliente porque es siempre la empresa propia.

---

## Checklist de implementación

---

### BLOQUE 1 — Backend (functions/)

#### Fase 1.1 — Modelo TypeScript de Cliente
**Archivo nuevo:** `functions/src/models/client.model.ts`

- [ ] Definir interfaz `Client`:
  ```typescript
  interface Client {
    id?: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    createdAt?: FirebaseFirestore.Timestamp | Date;
    updatedAt?: FirebaseFirestore.Timestamp | Date;
  }
  ```
- [ ] Definir `CreateClientDto` (sin `id`, sin timestamps) para el POST/PUT body

#### Fase 1.2 — Middleware de validación de Cliente
**Archivo nuevo:** `functions/src/middleware/validateClient.ts`

- [ ] Función `validateClient(req, res, next)` que valide:
  - `name` — string no vacío (requerido)
  - `email` — string no vacío (requerido)
  - `phone` — string (requerido, puede ser vacío `''` pero debe existir la clave)
  - `address` — string (requerido, puede ser vacío)
- [ ] Retornar `400` con `{ error, details[] }` si hay errores (mismo formato que `validateInvoice`)

#### Fase 1.3 — Router CRUD de Clientes
**Archivo nuevo:** `functions/src/routes/clients.ts`

- [ ] `GET /clients` — lista todos, `orderBy('createdAt', 'desc')`
- [ ] `GET /clients/:id` — obtiene uno, 404 si no existe
- [ ] `POST /clients` — crea con `validateClient` middleware, `serverTimestamp` en createdAt/updatedAt
- [ ] `PUT /clients/:id` — actualiza con `validateClient` middleware, 404 si no existe
- [ ] `DELETE /clients/:id` — elimina, 404 si no existe, 204 en éxito

#### Fase 1.4 — Registrar router en app.ts
**Archivo modificado:** `functions/src/app.ts`

- [ ] `import { clientsRouter } from './routes/clients'`
- [ ] `app.use('/clients', clientsRouter)` (después de `/invoices`)

#### Fase 1.5 — Agregar `phone?` a Invoice (backend)
**Archivo modificado:** `functions/src/models/invoice.model.ts`

- [ ] Agregar `phone?: string` a los objetos `from` y `to` en `Invoice` y `CreateInvoiceDto`
- [ ] **NO** modificar `validateInvoice` — phone es opcional, no se valida

#### Fase 1.6 — Tests de backend para Clientes
**Archivo nuevo:** `functions/tests/clients.test.ts`

Mismo patrón que `invoices.test.ts`: mock en memoria, import de `app` después de mocks.

- [ ] `GET /clients` — retorna array vacío (1 test)
- [ ] `GET /clients` — retorna clientes existentes (1 test)
- [ ] `POST /clients` — crea y retorna 201 con ID (1 test)
- [ ] `POST /clients` — 400 si falta name (1 test)
- [ ] `POST /clients` — 400 si falta email (1 test)
- [ ] `GET /clients/:id` — retorna el cliente por ID (1 test)
- [ ] `GET /clients/:id` — 404 si no existe (1 test)
- [ ] `PUT /clients/:id` — actualiza y retorna 200 (1 test)
- [ ] `PUT /clients/:id` — 404 si no existe (1 test)
- [ ] `DELETE /clients/:id` — elimina y retorna 204 (1 test)
- [ ] `DELETE /clients/:id` — 404 si no existe (1 test)
- [ ] **Ejecutar `npm test` en `functions/`** → todos los tests deben pasar (12 anteriores + ~11 nuevos)

---

### BLOQUE 2 — Frontend: base

#### Fase 2.1 — Modelo TypeScript de Cliente (frontend)
**Archivo nuevo:** `app/src/app/models/client.model.ts`

- [ ] Interfaz `Client`:
  ```typescript
  export interface Client {
    id?: string;
    name: string;
    email: string;
    phone: string;
    address: string;
  }
  ```

#### Fase 2.2 — Agregar `phone?` a Invoice (frontend)
**Archivo modificado:** `app/src/app/models/invoice.model.ts`

- [ ] Agregar `phone?: string` a los literales de `from` y `to` en la interfaz `Invoice`

#### Fase 2.3 — Agregar `clientsUrl` a los environments
**Archivos modificados:** los 3 archivos de `app/src/environments/`

- [ ] `environment.ts` → agregar `clientsUrl: 'http://localhost:5001/invoicer-dev/us-central1/api/clients'`
- [ ] `environment.qa.ts` → agregar `clientsUrl: 'https://us-central1-invoicer-qa.cloudfunctions.net/api/clients'`
- [ ] `environment.prod.ts` → agregar `clientsUrl: 'https://us-central1-invoicer-6a7c2.cloudfunctions.net/api/clients'`

#### Fase 2.4 — ClientService
**Archivo nuevo:** `app/src/app/services/client.service.ts`

- [ ] `@Injectable({ providedIn: 'root' })`
- [ ] `baseUrl = environment.clientsUrl`
- [ ] `getAll(): Observable<Client[]>`
- [ ] `getById(id: string): Observable<Client>`
- [ ] `create(client): Promise<string>` → retorna ID
- [ ] `update(id, client): Promise<void>`
- [ ] `delete(id): Promise<void>`

---

### BLOQUE 3 — Frontend: Página de Clientes (CRUD)

#### Fase 3.1 — Estructura de archivos
**Archivos nuevos en `app/src/app/pages/clients/`:**

- [ ] `clients-routing.module.ts` — routing module con ruta raíz `→ ClientsPage`
- [ ] `clients.module.ts` — `NgModule` con `CommonModule`, `ReactiveFormsModule`, `IonicModule`, `ClientsPageRoutingModule`
- [ ] `clients.page.ts` — componente principal (`standalone: false`)
- [ ] `clients.page.html` — template
- [ ] `clients.page.scss` — estilos

#### Fase 3.2 — `clients.page.ts` (lógica)

- [ ] Inyectar `ClientService`, `AlertController`, `ToastController`
- [ ] Propiedad `clients$: Observable<Client[]>` — lista principal
- [ ] Propiedad `searchTerm = ''` — para filtrado local
- [ ] Propiedad `clientModalOpen = false` — controla el modal create/edit
- [ ] Propiedad `editingClient: Client | null = null` — null = nuevo, populated = editar
- [ ] Propiedad `form: FormGroup` — formulario del modal (name, email, phone, address)
- [ ] `ngOnInit()` → carga `clients$`
- [ ] `openCreateModal()` — resetea el form, `editingClient = null`, abre modal
- [ ] `openEditModal(client)` — parchea el form, `editingClient = client`, abre modal
- [ ] `closeModal()` — cierra modal
- [ ] `saveClient()`:
  - Si form inválido → `markAllAsTouched()` y retorna
  - Si `editingClient` → llama `update()` en el service
  - Si no → llama `create()` en el service
  - Recarga la lista, cierra modal, muestra toast de éxito
- [ ] `confirmDelete(client)`:
  - `AlertController` con confirmación (mismo patrón que DashboardPage)
  - En handler → llama `delete()`, recarga la lista
- [ ] `get filteredClients$()` — pipe `map` sobre `clients$` filtrando por `searchTerm` (nombre o email)

#### Fase 3.3 — `clients.page.html` (template)

- [ ] `ion-header` con título "Clientes" + botón hamburger si aplica
- [ ] `ion-searchbar` para filtrado local en tiempo real → bind a `searchTerm`
- [ ] Lista de clientes con `*ngFor`:
  - `ion-item-sliding` por cada cliente
  - Contenido: nombre (bold), email, teléfono en `ion-note`
  - Opción deslizable (swipe) con botón Editar (azul) y Eliminar (rojo)
  - Click en el item → `openEditModal(client)`
- [ ] Estado vacío: `*ngIf="(clients$ | async)?.length === 0"` → mensaje "Sin clientes aún"
- [ ] `ion-fab` → `ion-fab-button` (+ ícono) → `openCreateModal()`
- [ ] **Modal create/edit:**
  ```
  ion-modal [isOpen]="clientModalOpen" (didDismiss)="closeModal()"
    ion-header > título dinámico "Nuevo Cliente" / "Editar Cliente"
    ion-content > form
      ion-input: Nombre (required)
      ion-input: Email (required, type=email)
      ion-input: Teléfono (type=tel)
      ion-textarea: Dirección
    ion-footer
      ion-button: Cancelar (fill=clear)
      ion-button: Guardar (color=primary)
  ```

#### Fase 3.4 — `clients.page.scss` (estilos)

- [ ] Estilos mínimos para el modal (height del contenido, padding del footer)
- [ ] Estilo para `ion-note` del teléfono en cada item de la lista

---

### BLOQUE 4 — Frontend: Navegación

#### Fase 4.1 — Shell routing
**Archivo modificado:** `app/src/app/shell/shell-routing.module.ts`

- [ ] Agregar ruta `clients`:
  ```typescript
  {
    path: 'clients',
    loadChildren: () =>
      import('../pages/clients/clients.module').then((m) => m.ClientsPageModule),
  }
  ```

#### Fase 4.2 — Sidebar
**Archivo modificado:** `app/src/app/shell/shell.component.html`

- [ ] Agregar `ion-item` para "Clientes" entre "Dashboard" y "Nueva Factura":
  ```html
  <ion-item button class="nav-item" routerLink="/clients" routerLinkActive="nav-active" (click)="closeMenu()">
    <ion-icon name="people-outline" slot="start"></ion-icon>
    <ion-label>Clientes</ion-label>
  </ion-item>
  ```

---

### BLOQUE 5 — Frontend: Formulario de Factura (teléfono + selector de cliente)

#### Fase 5.1 — Agregar `phone` al formulario (`editor.page.ts`)

- [ ] En `buildForm()` → agregar `phone: ['']` en los `fb.group` de `from` y `to`
- [ ] En `newItem()` — sin cambios
- [ ] Agregar propiedad `clientSelectorOpen = false`
- [ ] Agregar propiedad `clients$: Observable<Client[]>` para la lista del selector
- [ ] Agregar propiedad `clientSearch = ''` para el filtro del selector
- [ ] Inyectar `ClientService` en el constructor
- [ ] `ngOnInit()` → cargar `clients$ = this.clientService.getAll()`
- [ ] Método `openClientSelector()` — `clientSelectorOpen = true`
- [ ] Método `closeClientSelector()` — `clientSelectorOpen = false`
- [ ] Método `selectClient(client: Client)`:
  - `this.form.get('to')!.patchValue({ name: client.name, email: client.email, phone: client.phone, address: client.address })`
  - `clientSelectorOpen = false`
- [ ] Getter `filteredClients$` — pipe con filtrado por `clientSearch`

#### Fase 5.2 — Agregar campos `phone` al template (`editor.page.html`)

**Sección "De" (`from`):**
- [ ] Agregar `ion-input` para teléfono después del input de email:
  ```html
  <ion-item>
    <ion-input label="Teléfono" label-placement="stacked" type="tel" formControlName="phone"></ion-input>
  </ion-item>
  ```

**Sección "Cobrar a" (`to`):**
- [ ] Agregar botón "Seleccionar cliente" antes de los inputs del `to`:
  ```html
  <ion-button fill="outline" size="small" class="ion-margin-start ion-margin-top" (click)="openClientSelector()">
    <ion-icon slot="start" name="people-outline"></ion-icon>
    Seleccionar cliente
  </ion-button>
  ```
- [ ] Agregar `ion-input` para teléfono en el grupo `to` (igual que en `from`)
- [ ] Agregar modal del selector de clientes (al final de `ion-content`, fuera del grid):
  ```html
  <ion-modal [isOpen]="clientSelectorOpen" (didDismiss)="closeClientSelector()" [initialBreakpoint]="0.75" [breakpoints]="[0, 0.75, 1]">
    <ng-template>
      <ion-header>
        <ion-toolbar>
          <ion-title>Seleccionar cliente</ion-title>
          <ion-buttons slot="end">
            <ion-button (click)="closeClientSelector()">Cerrar</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-searchbar [(ngModel)]="clientSearch" placeholder="Buscar..."></ion-searchbar>
        <ion-list>
          <ion-item button *ngFor="let client of filteredClients$ | async" (click)="selectClient(client)">
            <ion-label>
              <h3>{{ client.name }}</h3>
              <p>{{ client.email }}</p>
              <p>{{ client.phone }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ng-template>
  </ion-modal>
  ```

#### Fase 5.3 — Agregar `FormsModule` al `EditorPageModule`

- [ ] En `editor.module.ts` → agregar `FormsModule` en imports (necesario para `[(ngModel)]` del searchbar del selector)

---

### BLOQUE 6 — Tests Backend

> Resumen de lo ya detallado en Fase 1.6

- [ ] `functions/tests/clients.test.ts` — 11 tests cubriendo los 5 endpoints
- [ ] `npm test` en `functions/` debe pasar los ~23 tests totales (12 existentes + 11 nuevos)

---

### BLOQUE 7 — Smoke tests manuales

- [ ] **7.1** Navegar a `/clients` → página lista vacía con FAB
- [ ] **7.2** Crear cliente → modal abre → llenar nombre, email, teléfono, dirección → Guardar → aparece en lista
- [ ] **7.3** Editar cliente → swipe o click → modal abre con datos pre-cargados → modificar → Guardar → lista actualizada
- [ ] **7.4** Eliminar cliente → alerta de confirmación → eliminar → desaparece de lista
- [ ] **7.5** Buscador → filtrar por nombre y email en tiempo real
- [ ] **7.6** Ir a `/editor/new` → sección "De" tiene campo teléfono
- [ ] **7.7** Sección "Cobrar a" → botón "Seleccionar cliente" → modal lista clientes → seleccionar uno → campos `to.name`, `to.email`, `to.phone`, `to.address` se llenan automáticamente
- [ ] **7.8** Guardar factura con cliente seleccionado → navega a preview sin error
- [ ] **7.9** Mobile (375px) → sidebar muestra "Clientes" → modal de cliente usable
- [ ] **7.10** El sidenav muestra "Clientes" activo cuando se está en `/clients`

---

### BLOQUE 8 — Documentación

- [ ] **8.1** Actualizar `context/overview.md` — agregar módulo Clientes en la tabla de estado
- [ ] **8.2** Actualizar `context/data-model.md` — agregar interfaz `Client` y nota de `phone?` en Invoice
- [ ] **8.3** Actualizar `context/api-reference.md` — documentar los 5 endpoints `/clients`
- [ ] **8.4** Actualizar `context/frontend.md` — agregar sección ClientsPage, ClientService, y notas del selector en EditorPage

---

## Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `functions/src/models/client.model.ts` | Interfaces Client y CreateClientDto |
| `functions/src/middleware/validateClient.ts` | Validación de payload de cliente |
| `functions/src/routes/clients.ts` | 5 endpoints CRUD |
| `functions/tests/clients.test.ts` | 11 tests Jest + Supertest |
| `app/src/app/models/client.model.ts` | Interfaz Client (frontend) |
| `app/src/app/services/client.service.ts` | CRUD HttpClient |
| `app/src/app/pages/clients/clients-routing.module.ts` | Routing del módulo |
| `app/src/app/pages/clients/clients.module.ts` | NgModule |
| `app/src/app/pages/clients/clients.page.ts` | Componente lista + modal |
| `app/src/app/pages/clients/clients.page.html` | Template |
| `app/src/app/pages/clients/clients.page.scss` | Estilos |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `functions/src/app.ts` | Registrar `/clients` router |
| `functions/src/models/invoice.model.ts` | `phone?` en from/to |
| `app/src/app/models/invoice.model.ts` | `phone?` en from/to |
| `app/src/environments/environment.ts` | Agregar `clientsUrl` |
| `app/src/environments/environment.qa.ts` | Agregar `clientsUrl` |
| `app/src/environments/environment.prod.ts` | Agregar `clientsUrl` |
| `app/src/app/pages/editor/editor.page.ts` | phone en form + selector lógica |
| `app/src/app/pages/editor/editor.page.html` | phone inputs + modal selector |
| `app/src/app/pages/editor/editor.module.ts` | Agregar FormsModule |
| `app/src/app/shell/shell-routing.module.ts` | Ruta `/clients` |
| `app/src/app/shell/shell.component.html` | Nav item "Clientes" |
| `context/overview.md` | Estado del módulo |
| `context/data-model.md` | Modelo Client + phone en Invoice |
| `context/api-reference.md` | Endpoints `/clients` |
| `context/frontend.md` | ClientsPage + selector |

---

## Orden de ejecución recomendado

```
Bloque 1 (Backend) → Bloque 6 (Tests Backend) → Bloque 2 (Base Frontend)
→ Bloque 3 (Página Clientes) → Bloque 4 (Navegación) → Bloque 5 (Editor)
→ Bloque 7 (Smoke) → Bloque 8 (Docs)
```

El backend primero permite tener la API estable antes de construir el frontend sobre ella.
