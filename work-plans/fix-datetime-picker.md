# Plan: Fix — ion-datetime no actualiza la fecha seleccionada

## Roles asignados
- **Experto en Ionic Framework 8** — comportamiento interno de `ion-datetime` (Stencil Web Component)
- **Experto en Angular 20** — change detection, reactive forms, template refs en `ng-template`
- **Especialista en integración Ionic + Angular** — bridges entre Web Components y Angular bindings

---

## Diagnóstico: 2 bugs del ion-datetime interactuando

### Bug A — Custom buttons bloquean `confirm()` automático

En el source de `ion-datetime` (Stencil), cuando el usuario toca una fecha:
1. Se actualiza `activeParts` (estado interno, NO expuesto)
2. Si hay botones custom (`slot="buttons"`), **NO llama a `this.confirm()`**
3. Por tanto `picker.value` **sigue siendo el valor inicial** (hoy)

```
Tap en fecha → activeParts ✅ actualizado → value ❌ NO actualizado
```

Fuente: `datetime.tsx` línea 700-706 — `if (hasSlottedButtons) return;`

**Fix requerido:** Llamar `await picker.confirm()` ANTES de leer `picker.value`.

### Bug B — `[value]` binding de Angular resetea la selección del usuario

Cada ciclo de Angular change detection re-aplica `[value]="form.get('issueDate')!.value"`
al Web Component. Esto dispara el `@Watch('value')` de Stencil, que llama `processValue()`
y **sobrescribe `activeParts`** con el valor del binding (la fecha original).

```
Usuario toca "27 marzo" → activeParts = 27 marzo
→ Angular CD dispara → [value]="2026-03-26" re-aplicado
→ @Watch fires → activeParts = 26 marzo (¡revertido!)
```

**Fix requerido:** NO usar `[value]` reactivo. Setear el valor inicial UNA sola vez.

---

## Solución

Usar el patrón recomendado por Ionic:
1. Guardar el valor inicial en una variable que NO cambie durante la vida del modal
2. Llamar `await picker.confirm()` antes de leer `picker.value`
3. Pasar la template ref `#picker` al handler de confirm (porque `@ViewChild` no ve dentro de `ng-template`)

---

## Checklist de implementación

### Fase 1 — Refactor del date picker (editor.page.ts)
- [ ] Agregar propiedad `issueDateInitial: string` que se setea UNA vez al abrir el modal
- [ ] Agregar propiedad `dueDateInitial: string` que se setea UNA vez al abrir el modal
- [ ] En `openIssueDateModal()`: setear `issueDateInitial` con el valor actual del form
- [ ] En `openDueDateModal()`: setear `dueDateInitial` con el valor actual del form
- [ ] En `confirmIssueDate(picker)`: llamar `await picker.confirm()` ANTES de leer `picker.value`
- [ ] En `confirmDueDate(picker)`: llamar `await picker.confirm()` ANTES de leer `picker.value`
- [ ] Hacer los métodos `async`

### Fase 2 — Refactor del template (editor.page.html)
- [ ] Cambiar `[value]="form.get('issueDate')!.value"` → `[value]="issueDateInitial"`
- [ ] Cambiar `[value]="form.get('dueDate')!.value || minDueDate"` → `[value]="dueDateInitial"`
- [ ] Mantener las template refs `#issuePicker` y `#duePicker`

### Fase 3 — Verificación manual
- [ ] Abrir editor de factura nueva
- [ ] Tocar "Fecha de emisión" → seleccionar fecha diferente a hoy → Confirmar → Verificar que cambia
- [ ] Tocar "Fecha de vencimiento" → seleccionar fecha futura → Confirmar → Verificar que cambia
- [ ] Editar factura existente → verificar que carga las fechas guardadas
- [ ] Cambiar fecha en factura existente → guardar → reabrir → verificar persistencia

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `app/src/app/pages/editor/editor.page.ts` | Agregar `issueDateInitial` / `dueDateInitial`, hacer `confirm()` async, llamar `picker.confirm()` |
| `app/src/app/pages/editor/editor.page.html` | Cambiar `[value]` de bindings reactivos a variables estáticas |

---

## Código objetivo

### TypeScript
```typescript
issueDateInitial = '';
dueDateInitial = '';

openIssueDateModal() {
  this.issueDateInitial = this.form.get('issueDate')!.value || new Date().toISOString().split('T')[0];
  this.issueDateModalOpen = true;
}

async confirmIssueDate(picker: IonDatetime) {
  await picker.confirm();  // ← commits activeParts → value
  const val = picker.value as string;
  if (val) this.form.get('issueDate')!.setValue(val.substring(0, 10));
  this.issueDateModalOpen = false;
}
```

### HTML
```html
<ion-datetime
  #issuePicker
  presentation="date"
  [value]="issueDateInitial"
  ...>
```

---

## Por qué las soluciones anteriores no funcionaron

| Intento | Por qué falló |
|---|---|
| `(ionChange)` | No se dispara con custom buttons (Bug A) |
| `@ViewChild` + leer `.value` | `.value` no estaba actualizado sin `confirm()` (Bug A) + `@ViewChild` no ve dentro de `ng-template` |
| Template ref `#picker` pasada al handler | `.value` seguía sin actualizarse porque faltaba `await picker.confirm()` (Bug A) + `[value]` reactivo reseteaba la selección (Bug B) |

La solución actual ataca ambos bugs simultáneamente.
