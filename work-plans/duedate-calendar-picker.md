# Plan: Calendar Picker para Fecha de Vencimiento
**Fecha:** 2026-03-25
**Alcance:** `EditorPage` — campo `dueDate`
**Archivos afectados:** `editor.page.ts`, `editor.page.html`, `editor.page.scss`

---

## Contexto del flujo actual

El campo `dueDate` hoy es un `ion-input[type="date"]`, que delega al date picker nativo del browser. Esto tiene dos problemas:
1. Comportamiento inconsistente entre Chrome (desktop), Safari (iOS) y Android
2. No permite restringir fechas pasadas de forma fiable cross-platform
3. No hay forma de agregar un botón "Hoy" en la UI nativa

La solución es reemplazarlo por `ion-datetime` de Ionic (cross-platform, controlable) presentado dentro de un `ion-modal` que se abre al tocar el campo.

---

## Decisiones técnicas

| Decisión | Opción elegida | Alternativa descartada | Por qué |
|----------|---------------|----------------------|---------|
| Componente de fecha | `ion-datetime` | `input[type=date]` nativo | Cross-platform, customizable |
| Presentación | `ion-modal` controlado por componente | `IonDatetimeButton` | Permite agregar botón "Hoy" con control total |
| Binding al form | Temporal (`tempDueDate`) + commit manual | `formControlName` directo | `ion-datetime` retorna ISO completo; el form espera `YYYY-MM-DD`. Separar permite cancelar sin afectar el form. |
| Fecha mínima | Hoy inclusive (`>= today`) | Mañana (`> today`) | Una factura con vencimiento hoy tiene sentido de negocio. Fácil de cambiar si se requiere solo futuro estricto. |
| Botón "Hoy" | Slot `buttons` de `ion-datetime` | Botón externo al modal | Queda integrado visualmente con los controles nativos del picker |

---

## Checklist de implementación

### Fase 1 — `editor.page.ts` (lógica)

- [ ] **1.1** Agregar propiedad `dueDateModalOpen = false` para controlar la visibilidad del modal
- [ ] **1.2** Agregar propiedad `tempDueDate: string = ''` para la fecha seleccionada temporalmente mientras el modal está abierto (no se comitea hasta confirmar)
- [ ] **1.3** Agregar getter `minDueDate: string` que retorna la fecha de hoy en formato `YYYY-MM-DD` (calculado en runtime, siempre "hoy")
- [ ] **1.4** Agregar getter `dueDateDisplay: string` que retorna la fecha formateada en español para mostrar en el campo (`DD/MM/YYYY`) o `'Seleccionar fecha'` si está vacío
- [ ] **1.5** Agregar método `openDueDateModal()`:
  - Setea `tempDueDate` al valor actual del form (si existe) o a `minDueDate`
  - Setea `dueDateModalOpen = true`
- [ ] **1.6** Agregar método `onDatetimeChange(event: CustomEvent)`:
  - Actualiza `tempDueDate` con el valor emitido por `ion-datetime` (string ISO)
- [ ] **1.7** Agregar método `confirmDueDate()`:
  - Parsea `tempDueDate` → `YYYY-MM-DD` (tomar solo los primeros 10 chars del ISO)
  - Hace `this.form.get('dueDate')!.setValue(...)` con ese valor
  - Cierra el modal: `dueDateModalOpen = false`
- [ ] **1.8** Agregar método `setDueDateToday()`:
  - Calcula la fecha de hoy `YYYY-MM-DD`
  - La setea directamente en el form: `this.form.get('dueDate')!.setValue(today)`
  - Cierra el modal: `dueDateModalOpen = false`
- [ ] **1.9** Agregar método `cancelDueDate()`:
  - Cierra el modal sin modificar el form: `dueDateModalOpen = false`

### Fase 2 — `editor.page.html` (template)

- [ ] **2.1** Reemplazar el `ion-col` completo del campo `dueDate` (líneas 31-35 actuales):

  **Antes:**
  ```html
  <ion-col size="12" size-md="4">
    <ion-item>
      <ion-input label="Fecha de vencimiento" label-placement="stacked" type="date" formControlName="dueDate"></ion-input>
    </ion-item>
  </ion-col>
  ```

  **Después:** Trigger field (ion-item clickeable) + ion-modal con ion-datetime:
  ```html
  <!-- TRIGGER: campo que abre el modal -->
  <ion-col size="12" size-md="4">
    <ion-item button detail="false" (click)="openDueDateModal()">
      <ion-label position="stacked">Fecha de vencimiento</ion-label>
      <ion-text [class.placeholder]="!form.get('dueDate')!.value">
        {{ dueDateDisplay }}
      </ion-text>
      <ion-icon slot="end" name="calendar-outline"></ion-icon>
    </ion-item>
  </ion-col>

  <!-- MODAL con ion-datetime -->
  <ion-modal [isOpen]="dueDateModalOpen" (didDismiss)="cancelDueDate()" [initialBreakpoint]="1" [breakpoints]="[0, 1]" cssClass="date-picker-modal">
    <ng-template>
      <ion-datetime
        presentation="date"
        [min]="minDueDate"
        [value]="tempDueDate"
        (ionChange)="onDatetimeChange($event)"
        locale="es-MX"
        [showDefaultButtons]="false">
        <ion-buttons slot="buttons">
          <ion-button fill="clear" (click)="cancelDueDate()">Cancelar</ion-button>
          <ion-button fill="clear" (click)="setDueDateToday()">Hoy</ion-button>
          <ion-button fill="solid" color="primary" (click)="confirmDueDate()">Confirmar</ion-button>
        </ion-buttons>
      </ion-datetime>
    </ng-template>
  </ion-modal>
  ```

  > **Nota:** El `ion-modal` debe colocarse fuera del `ion-row` / `ion-grid`, idealmente al final de `ion-content` antes de cerrar `</ion-grid>` o como hermano del grid. Los modales en Ionic están pensados para estar al nivel del `ion-content`.

- [ ] **2.2** Verificar que `formControlName="dueDate"` se elimina del `ion-input` original — el form control sigue existiendo en TypeScript pero el binding visual pasa a ser manual via los métodos del paso 1.

### Fase 3 — `editor.page.scss` (estilos)

- [ ] **3.1** Agregar clase `.placeholder` para el texto cuando no hay fecha seleccionada:
  ```scss
  .placeholder {
    color: var(--ion-color-medium);
    font-size: 0.9rem;
  }
  ```
- [ ] **3.2** Agregar estilos para `ion-text` en el trigger field para que se vea como un valor de input:
  ```scss
  ion-item ion-text {
    margin-top: 4px;
    font-size: 0.95rem;
  }
  ```
- [ ] **3.3** (Opcional) Si el breakpoint del modal no queda bien visualmente en desktop, ajustar con `::ng-deep` o `cssClass` del modal.

### Fase 4 — Validación del formulario

- [ ] **4.1** Verificar que el `Validators.required` existente en `dueDate` funciona correctamente — el botón "Guardar" debe seguir deshabilitado si no se seleccionó fecha.
- [ ] **4.2** Verificar que `form.markAllAsTouched()` en el método `save()` sigue mostrando error si `dueDate` está vacío al intentar guardar sin fecha.
- [ ] **4.3** (Opcional) Agregar error visual en el trigger field cuando el control es inválido y ha sido tocado:
  ```html
  <ion-note color="danger" *ngIf="form.get('dueDate')!.invalid && form.get('dueDate')!.touched">
    Selecciona una fecha de vencimiento
  </ion-note>
  ```

### Fase 5 — Caso edición de factura existente

- [ ] **5.1** Verificar que `loadInvoice()` popula `dueDate` correctamente via `form.patchValue(invoice)` — esto ya funciona, no requiere cambios.
- [ ] **5.2** Verificar que al abrir el modal en modo edición, el `ion-datetime` muestra la fecha pre-existente de la factura (via `tempDueDate` inicializado en `openDueDateModal()`).
- [ ] **5.3** Verificar que si la factura guardada tiene una fecha pasada (creada antes de este cambio), el modal la muestra correctamente aunque esté antes del `min` — `ion-datetime` mostrará la fecha aunque esté fuera del rango seleccionable.

### Fase 6 — Pruebas manuales (smoke test)

- [ ] **6.1** **Flujo feliz — nueva factura:** Abrir `/editor/new` → tocar campo "Fecha de vencimiento" → verificar que se abre el modal → seleccionar una fecha futura → confirmar → verificar que el campo muestra la fecha formateada en español.
- [ ] **6.2** **Botón "Hoy":** Abrir el modal → tocar "Hoy" → verificar que el modal se cierra y el campo muestra la fecha de hoy.
- [ ] **6.3** **Restricción de fechas pasadas:** En el modal, verificar que los días anteriores a hoy aparecen deshabilitados (no seleccionables).
- [ ] **6.4** **Cancelar:** Abrir el modal sin seleccionar → tocar "Cancelar" → verificar que el campo no cambió.
- [ ] **6.5** **Validación:** Intentar guardar sin `dueDate` → verificar que el formulario muestra error y bloquea el guardado.
- [ ] **6.6** **Flujo edición:** Abrir una factura existente → verificar que el campo muestra la fecha guardada → abrir modal → verificar que el `ion-datetime` apunta a la fecha guardada.
- [ ] **6.7** **Mobile (viewport 375px):** Verificar que el modal se presenta como bottom sheet y es usable en pantalla pequeña.
- [ ] **6.8** **Desktop (viewport >768px):** Verificar que el modal se presenta centrado o como popover sin desbordarse.

### Fase 7 — Tests unitarios

> El proyecto **no tiene tests de Angular/Ionic** configurados (solo Jest para el backend en `functions/`). Agregar un test de Karma/Jasmine requeriría setup de `TestBed` que está fuera del alcance de esta tarea.

- [ ] **7.1** **No aplica** — No hay tests de frontend. El backend (12 tests Jest) no se ve afectado por este cambio ya que no modifica el modelo de datos ni la API.
- [ ] **7.2** (Opcional futuro) Si en el futuro se agrega testing de componentes Angular, los casos a cubrir serían:
  - `minDueDate` retorna siempre la fecha de hoy
  - `dueDateDisplay` retorna placeholder cuando el form está vacío
  - `confirmDueDate()` setea el valor en el form y cierra el modal
  - `setDueDateToday()` setea hoy en el form y cierra el modal
  - `cancelDueDate()` no modifica el form

### Fase 8 — Actualización de documentación del proyecto

- [ ] **8.1** Actualizar `context/frontend.md` — agregar en la sección EditorPage la nota sobre el date picker modal para `dueDate`.
- [ ] **8.2** Actualizar `context/known-issues.md` si surge algún problema durante la implementación.

---

## Archivos a modificar

| Archivo | Tipo de cambio |
|---------|---------------|
| `app/src/app/pages/editor/editor.page.ts` | Propiedades + 6 métodos nuevos |
| `app/src/app/pages/editor/editor.page.html` | Reemplazar campo dueDate + agregar ion-modal |
| `app/src/app/pages/editor/editor.page.scss` | 2–3 reglas CSS nuevas |

**No se modifican:**
- `editor.module.ts` — `IonicModule` ya incluye `ion-datetime` y `ion-modal`
- `editor-routing.module.ts` — sin cambios de rutas
- Nada en `functions/` — cambio puramente de UI

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| `ion-datetime` retorna ISO full (`2026-03-25T00:00:00`) — el form espera `YYYY-MM-DD` | Parsear con `.substring(0, 10)` en `confirmDueDate()` y `setDueDateToday()` |
| El modal no cierra al tocar el backdrop en Ionic 8 | Manejar `(didDismiss)` del modal → llama `cancelDueDate()` |
| `locale="es-MX"` no disponible en todos los entornos | Si falla, retirar el atributo (queda en inglés, funcionalmente igual) |
| Facturas existentes con `dueDate` en formato diferente | `patchValue` ya funciona; solo verificar en smoke test 6.6 |

---

## Estimado de trabajo

| Fase | Esfuerzo |
|------|---------|
| Fase 1 (TS) | ~30 min |
| Fase 2 (HTML) | ~20 min |
| Fase 3 (SCSS) | ~10 min |
| Fase 4–5 (validación + edición) | ~15 min |
| Fase 6 (smoke tests manuales) | ~20 min |
| Fase 7–8 (docs) | ~10 min |
| **Total** | **~1h 45min** |
