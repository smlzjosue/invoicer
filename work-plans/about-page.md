# Plan: Sección "Acerca de"
**Fecha:** 2026-03-25
**Scope:** Frontend únicamente — sin cambios en el backend

---

## Contenido de la página

| Campo | Valor |
|-------|-------|
| Desarrollado por | Ing. Samuel Lozada |
| Portal web | https://ingjesdlozcorp-4c58b.web.app/ |
| Teléfono | +413 667 9761 |
| Email | ingjesdlozcorp@gmail.com |
| LinkedIn | https://www.linkedin.com/in/samuel-j-lozada-k-797299126/?locale=en |
| Versión de la app | Leída dinámicamente de `environment.appVersion` |

---

## Decisiones de diseño

| Decisión | Elección | Razón |
|----------|---------|-------|
| Tipo de vista | Página dedicada `/about` (no modal) | Consistente con el patrón del resto del app (clients, profile) |
| Versión de la app | Campo `appVersion` en los 3 environments | El componente lee `environment.appVersion` — misma versión en todos los ambientes, fácil de actualizar en un solo lugar por ambiente si se necesita |
| Valor inicial de versión | `'1.0.0'` | Primera versión pública |
| Links externos | `<a href="..." target="_blank" rel="noopener">` nativos dentro de `ion-item` | Funcionan en web y en Capacitor/mobile sin plugins adicionales |
| Teléfono | `href="tel:+4136679761"` | Abre la app de llamadas en mobile |
| Email | `href="mailto:ingjesdlozcorp@gmail.com"` | Abre el cliente de correo |
| Ubicación en sidebar | Footer, entre "Mi Perfil" y "Cerrar Sesión", ícono `information-circle-outline` | Zona de utilidades — no es navegación principal |
| Estilo de la página | Card central con avatar/logo del desarrollador + lista de contacto con íconos | Visual limpio, tipo "about screen" estándar de apps móviles |

---

## Checklist de implementación

---

### Fase 1 — Agregar `appVersion` a los environments

**Archivos modificados:** los 3 archivos de `app/src/environments/`

- [ ] `environment.ts` → agregar `appVersion: '1.0.0'`
- [ ] `environment.qa.ts` → agregar `appVersion: '1.0.0'`
- [ ] `environment.prod.ts` → agregar `appVersion: '1.0.0'`

> Los 3 tienen la misma versión inicialmente. Para bumps futuros se actualiza solo `environment.prod.ts` (o los tres si se versionan por ambiente).

---

### Fase 2 — Crear la AboutPage (5 archivos)

#### Fase 2.1 — Estructura de archivos
**Archivos nuevos en `app/src/app/pages/about/`:**

- [ ] `about-routing.module.ts`
- [ ] `about.module.ts` — `NgModule` con `CommonModule`, `IonicModule`, `AboutPageRoutingModule`
  > No necesita `ReactiveFormsModule` — es una página de solo lectura
- [ ] `about.page.ts`
- [ ] `about.page.html`
- [ ] `about.page.scss`

#### Fase 2.2 — `about.page.ts` (lógica)

- [ ] `standalone: false`
- [ ] Importar `environment` de `../../environments/environment`
- [ ] Propiedad `appVersion = environment.appVersion`
- [ ] Propiedad `appEnv = environment.envName`
- [ ] Propiedades de contacto como constantes del componente:
  ```typescript
  readonly developer = 'Ing. Samuel Lozada';
  readonly website  = 'https://ingjesdlozcorp-4c58b.web.app/';
  readonly phone    = '+413 667 9761';
  readonly phoneHref = 'tel:+4136679761';
  readonly email    = 'ingjesdlozcorp@gmail.com';
  readonly linkedin = 'https://www.linkedin.com/in/samuel-j-lozada-k-797299126/?locale=en_US';
  ```
- [ ] **No necesita servicios inyectados** — toda la info es estática + environment

#### Fase 2.3 — `about.page.html` (template)

Estructura:
```
ion-header
  ion-toolbar color="primary"
    ion-menu-button slot="start"
    ion-title: "Acerca de"

ion-content
  ion-grid fixed
    <!-- Card del desarrollador -->
    ion-card (centrado)
      ion-card-header
        div.dev-avatar  →  ícono "code-slash-outline" o iniciales "SL"
        ion-card-title  →  "FacturaFácil"
        ion-card-subtitle  →  "v{{ appVersion }}  ·  {{ appEnv }}"
      ion-card-content
        p "Desarrollado por {{ developer }}"

    <!-- Lista de contacto -->
    ion-list lines="full"
      ion-item (a href website, target _blank)
        ion-icon name="globe-outline" slot="start"
        ion-label
          p "Portal web"
          p (secondary) website URL
        ion-icon name="open-outline" slot="end"

      ion-item (a href phoneHref)
        ion-icon name="call-outline" slot="start"
        ion-label
          p "Teléfono"
          p (secondary) phone
        ion-icon name="open-outline" slot="end"

      ion-item (a href mailto:email, target _blank)
        ion-icon name="mail-outline" slot="start"
        ion-label
          p "Email"
          p (secondary) email
        ion-icon name="open-outline" slot="end"

      ion-item (a href linkedin, target _blank)
        ion-icon name="logo-linkedin" slot="start"
        ion-label
          p "LinkedIn"
          p (secondary) "Ver perfil"
        ion-icon name="open-outline" slot="end"

    <!-- Footer de copyright -->
    p.copyright  →  "© {{ currentYear }} Ing. Samuel Lozada. Todos los derechos reservados."
```

- [ ] Getter `currentYear` en el TS: `new Date().getFullYear()`
- [ ] Los `ion-item` que son links: usar `href` directamente en `ion-item` o con un `<a>` wrapper — **no usar `routerLink`** (son links externos)
- [ ] Atributo `rel="noopener noreferrer"` en todos los links `target="_blank"`

#### Fase 2.4 — `about.page.scss` (estilos)

- [ ] `.dev-avatar` — círculo grande centrado con color primary, ícono o iniciales blancas
- [ ] `ion-card` — `max-width: 480px`, centrado con `margin: 16px auto`
- [ ] `ion-card-title` — centrado, font grande
- [ ] `ion-card-subtitle` — centrado, color medium
- [ ] `p` "Desarrollado por" — centrado, margin top
- [ ] `ion-list` — `border-radius: 8px`, overflow hidden (para que respete el rounded de la card)
- [ ] `a` dentro de `ion-item` — `text-decoration: none`, `color: inherit`, display block para que ocupe todo el item
- [ ] `.copyright` — centrado, color medium, font pequeño, padding top/bottom
- [ ] `ion-icon[name="logo-linkedin"]` — color LinkedIn azul (#0077B5) para reconocimiento visual

---

### Fase 3 — Navegación

#### Fase 3.1 — Shell routing
**Archivo modificado:** `app/src/app/shell/shell-routing.module.ts`

- [ ] Agregar ruta `about`:
  ```typescript
  {
    path: 'about',
    loadChildren: () =>
      import('../pages/about/about.module').then((m) => m.AboutPageModule),
  }
  ```

#### Fase 3.2 — Sidebar: nav item "Acerca de"
**Archivo modificado:** `app/src/app/shell/shell.component.html`

- [ ] Agregar en el footer, entre "Mi Perfil" y "Cerrar Sesión":
  ```html
  <ion-item button class="nav-item" routerLink="/about" routerLinkActive="nav-active" (click)="closeMenu()">
    <ion-icon name="information-circle-outline" slot="start"></ion-icon>
    <ion-label>Acerca de</ion-label>
  </ion-item>
  ```

---

### Fase 4 — Tests

**Backend:** Sin cambios → los 24 tests siguen intactos.
- [ ] Correr `npm test` en `functions/` y verificar 24/24

**Frontend:** No hay framework de tests configurado → no aplica tests automáticos.

---

### Fase 5 — Smoke tests manuales

- [ ] **5.1** Navegar a `/about` desde el sidebar → página carga sin errores
- [ ] **5.2** Versión muestra `v1.0.0 · dev` en el ambiente de desarrollo
- [ ] **5.3** Nombre del desarrollador: "Ing. Samuel Lozada" visible
- [ ] **5.4** Click en "Portal web" → abre `https://ingjesdlozcorp-4c58b.web.app/` en nueva pestaña
- [ ] **5.5** Click en "Teléfono" → abre app de llamadas con `+413 667 9761`
- [ ] **5.6** Click en "Email" → abre cliente de correo con `ingjesdlozcorp@gmail.com`
- [ ] **5.7** Click en "LinkedIn" → abre el perfil de LinkedIn en nueva pestaña
- [ ] **5.8** "Acerca de" en el sidebar muestra `routerLinkActive` cuando la ruta está activa
- [ ] **5.9** Año del copyright es el año actual (dinámico)
- [ ] **5.10** Mobile: la card no se desborda, la lista es legible en 375px

---

### Fase 6 — Documentación

- [ ] **6.1** Actualizar `context/frontend.md` — agregar sección `AboutPage` y nota de `appVersion` en environments
- [ ] **6.2** Actualizar `context/overview.md` — agregar "Sección Acerca de" en tabla de estado

---

## Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `app/src/app/pages/about/about-routing.module.ts` | Routing del módulo |
| `app/src/app/pages/about/about.module.ts` | NgModule |
| `app/src/app/pages/about/about.page.ts` | Propiedades estáticas + appVersion |
| `app/src/app/pages/about/about.page.html` | Template con card + lista de contacto |
| `app/src/app/pages/about/about.page.scss` | Estilos visuales |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `app/src/environments/environment.ts` | Agregar `appVersion: '1.0.0'` |
| `app/src/environments/environment.qa.ts` | Agregar `appVersion: '1.0.0'` |
| `app/src/environments/environment.prod.ts` | Agregar `appVersion: '1.0.0'` |
| `app/src/app/shell/shell-routing.module.ts` | Ruta `/about` |
| `app/src/app/shell/shell.component.html` | Nav item "Acerca de" |
| `context/frontend.md` | Docs |
| `context/overview.md` | Docs |

**No se modifica nada en `functions/`.**

---

## Orden de ejecución

```
Fase 1 (environments) → Fase 2 (AboutPage) → Fase 3 (navegación)
→ Fase 4 (tests regresión) → Fase 5 (smoke) → Fase 6 (docs)
```
