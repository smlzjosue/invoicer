# Plan: Layout Responsivo con Menú Lateral

## Objetivo
Reemplazar la navegación actual (toolbars independientes por página) por un layout shell unificado que muestre:
- **Desktop / Web (≥768px)**: sidebar siempre visible a la izquierda
- **Mobile (<768px)**: sidebar oculto, controlado con botón hamburguesa (drawer)

---

## Análisis del estado actual

- App shell: `<ion-app><ion-router-outlet></ion-router-outlet></ion-app>` (sin layout compartido)
- Rutas autenticadas: `dashboard`, `editor/:id`, `preview/:id` (cada una con su propia toolbar)
- No existe ningún componente de tabs ni shell intermedio
- Ionic ya incluye `ion-split-pane` + `ion-menu` que manejan este comportamiento de forma nativa

## Estrategia técnica

Usar **`ion-split-pane`** (componente nativo de Ionic):
- En pantallas `≥ md (768px)`: muestra el menú como sidebar fijo
- En pantallas `< md`: oculta el sidebar, y `<ion-menu-button>` muestra el ícono hamburguesa
- No requiere CSS manual ni BreakpointObserver

**Arquitectura final:**
```
AppComponent
└── ShellComponent (nuevo — envuelve rutas autenticadas)
    ├── ion-split-pane
    │   ├── ion-menu (sidebar con navegación)
    │   │   ├── Logo / Brand
    │   │   ├── nav: Dashboard
    │   │   ├── nav: Nueva Factura
    │   │   └── btn: Cerrar Sesión
    │   └── ion-router-outlet (contenido principal)
    └── Cada page ya no necesita su propia toolbar de navegación lateral
```

**Rutas:**
```
/login          → LoginPage (sin shell)
/               → ShellComponent
                  ├── dashboard → DashboardPage
                  ├── editor/:id → EditorPage
                  └── preview/:id → PreviewPage
```

---

## Fases e implementación

### ✅ Fase 1 — Crear ShellModule y ShellComponent

- [ ] 1.1 Crear `app/src/app/shell/shell.component.ts` (`standalone: false`)
- [ ] 1.2 Crear `app/src/app/shell/shell.component.html` con `ion-split-pane` + `ion-menu` + `ion-router-outlet`
- [ ] 1.3 Crear `app/src/app/shell/shell.component.scss` con estilos del sidebar
- [ ] 1.4 Crear `app/src/app/shell/shell-routing.module.ts` (rutas hijas: dashboard, editor, preview)
- [ ] 1.5 Crear `app/src/app/shell/shell.module.ts` (declara ShellComponent, importa IonicModule, RouterModule, CommonModule)

**Contenido del sidebar:**
- Header: ícono `receipt-outline` + "Invoicer" (misma marca del login)
- Ítem: ícono `grid-outline` + "Dashboard" → `/dashboard`
- Ítem: ícono `add-circle-outline` + "Nueva Factura" → `/editor/new`
- Divider
- Ítem: ícono `log-out-outline` + "Cerrar Sesión" (llama `AuthService.signOut()`)

**Clase activa:** usar `routerLinkActive="active"` en cada `ion-item`

---

### ✅ Fase 2 — Actualizar App Routing

- [ ] 2.1 Modificar `app-routing.module.ts`:
  - Ruta `login` queda igual (sin guard, sin shell)
  - Crear ruta padre `''` que carga `ShellModule` con `authGuard`
  - Mover `dashboard`, `editor/:id`, `preview/:id` como rutas hijas del shell
  - Eliminar `authGuard` individual de cada ruta hija (el padre ya lo tiene)

```typescript
// Resultado esperado en app-routing.module.ts
{ path: 'login', loadChildren: () => import('./pages/login/login.module') },
{
  path: '',
  canActivate: [authGuard],
  loadChildren: () => import('./shell/shell.module'),
},
{ path: '**', redirectTo: '' }
```

---

### ✅ Fase 3 — Adaptar páginas existentes

Cada página autenticada actualmente tiene su propia `<ion-header>` con toolbar de título. Hay que:

- [ ] 3.1 **DashboardPage** (`dashboard.page.html` + `.ts`):
  - Reemplazar `<ion-title>` por `<ion-menu-button>` + título simple
  - Quitar el botón de logout del toolbar (ahora está en el sidebar)
  - El botón "Nueva Factura" (FAB) se queda

- [ ] 3.2 **EditorPage** (`editor.page.html`):
  - Mantener botón back `<ion-back-button>`
  - Agregar `<ion-menu-button>` junto al back (en mobile, el back tiene prioridad visual)
  - En desktop el sidebar está visible, por lo que el back button sigue siendo útil

- [ ] 3.3 **PreviewPage** (`preview.page.html`):
  - Mismo tratamiento que EditorPage
  - Mantener botones de print y edit

---

### ✅ Fase 4 — Estilos del Shell

- [ ] 4.1 Sidebar con paleta verde actual:
  - Fondo: `var(--ion-color-primary)` (verde oscuro `#2F6B3F`)
  - Texto/íconos: blanco
  - Ítem activo: fondo `rgba(255,255,255,0.15)` + borde izquierdo blanco de 3px
  - Hover: `rgba(255,255,255,0.08)`
- [ ] 4.2 Header del sidebar: logo centrado, fuente bold
- [ ] 4.3 En desktop: sidebar fijo de 260px de ancho, contenido ocupa el resto
- [ ] 4.4 Transición suave al abrir/cerrar en mobile (ya la maneja Ionic)
- [ ] 4.5 `ion-menu-button` solo visible en mobile (en desktop el sidebar ya está abierto)

---

### ✅ Fase 5 — Tests

- [ ] 5.1 `shell.component.spec.ts`:
  - Renderiza correctamente (smoke test)
  - Contiene `ion-split-pane`, `ion-menu`, `ion-router-outlet`
  - Los links de navegación tienen `routerLink` correcto
  - El botón de logout llama a `AuthService.signOut()`

---

### ✅ Fase 6 — Verificación

- [ ] 6.1 Build sin errores: `npm run build`
- [ ] 6.2 Verificar en navegador ancho (>768px): sidebar siempre visible
- [ ] 6.3 Verificar en DevTools mobile (< 768px): sidebar oculto, hamburguesa visible
- [ ] 6.4 Verificar navegación: click en items del sidebar navega correctamente
- [ ] 6.5 Verificar item activo: se resalta la ruta actual en el sidebar
- [ ] 6.6 Verificar logout desde sidebar funciona y redirige a `/login`
- [ ] 6.7 Verificar que el login sigue sin mostrar el shell

---

## Archivos a crear

| Archivo | Acción |
|---|---|
| `app/src/app/shell/shell.component.ts` | CREAR |
| `app/src/app/shell/shell.component.html` | CREAR |
| `app/src/app/shell/shell.component.scss` | CREAR |
| `app/src/app/shell/shell.module.ts` | CREAR |
| `app/src/app/shell/shell-routing.module.ts` | CREAR |
| `app/src/app/shell/shell.component.spec.ts` | CREAR |

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `app/src/app/app-routing.module.ts` | Reorganizar rutas para usar ShellModule como padre |
| `app/src/app/pages/dashboard/dashboard.page.html` | Agregar `ion-menu-button`, quitar logout del toolbar |
| `app/src/app/pages/dashboard/dashboard.page.ts` | Quitar lógica de logout |
| `app/src/app/pages/editor/editor.page.html` | Agregar `ion-menu-button` |
| `app/src/app/pages/preview/preview.page.html` | Agregar `ion-menu-button` |

---

## Notas técnicas

- `ion-split-pane` usa `contentId` para enlazar el outlet: `<ion-split-pane contentId="main-content">`
- `ion-menu` debe tener `menuId` o `contentId` que coincida
- `<ion-router-outlet id="main-content">` en el contenido principal
- `ion-menu-button` abre/cierra el menu automáticamente sin necesidad de `MenuController`
- `routerLinkActive` en items del menu aplica clase CSS para el estado activo
- El `authGuard` en la ruta padre del shell protege todas las rutas hijas sin duplicar lógica
