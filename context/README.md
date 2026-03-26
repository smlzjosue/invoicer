# Contexto del Proyecto — FacturaFácil

Esta carpeta contiene la documentación de referencia del proyecto para facilitar futuras sesiones de trabajo.

## Archivos

| Archivo | Contenido |
|---------|---------|
| [overview.md](./overview.md) | Visión general, stack tecnológico, estado actual, pendientes |
| [architecture.md](./architecture.md) | Diagrama del sistema, decisiones de arquitectura, estructura de directorios |
| [api-reference.md](./api-reference.md) | Todos los endpoints REST con request/response shapes |
| [data-model.md](./data-model.md) | Modelo de datos Invoice, estados, cálculo de totales |
| [frontend.md](./frontend.md) | Páginas, servicios, reglas importantes de Angular/Ionic |
| [setup.md](./setup.md) | Comandos para correr, buildear, deployar y testear |
| [known-issues.md](./known-issues.md) | Problemas conocidos, causas y soluciones |

## TL;DR para empezar a trabajar

```bash
# Correr localmente
cd functions && npm run serve:local   # emulador
cd app && npm run start:dev           # Ionic
```

Requiere: `gcloud auth application-default login` hecho previamente.
