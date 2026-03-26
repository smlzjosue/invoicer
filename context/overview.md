# FacturaFácil — Visión General del Proyecto
**Última actualización:** 2026-03-25

## ¿Qué es?
App de gestión de facturas (invoicing) construida con Ionic + Angular en el frontend y Firebase Cloud Functions + Firestore en el backend. Permite crear, editar, previsualizar y eliminar facturas.

## Stack Tecnológico

### Frontend — `app/`
| Tecnología | Versión | Rol |
|-----------|---------|-----|
| Ionic Framework | ^8.0.0 | UI components, mobile-first |
| Angular | ^20.0.0 | Framework (NgModule pattern, **NO standalone components**) |
| Firebase JS SDK | ^11.10.0 | Firebase Auth (Google Sign-In) en el cliente |
| HttpClient | Angular | Comunicación con la API REST |
| RxJS | ~7.8.0 | Observables para streams de datos |

### Backend — `functions/`
| Tecnología | Versión | Rol |
|-----------|---------|-----|
| Firebase Cloud Functions v2 | ^6.0.0 | Entrypoint HTTP serverless |
| Express.js | ^4.19.2 | Router HTTP dentro de la Function |
| Firebase Admin SDK | ^12.0.0 | Acceso a Firestore (bypassa security rules) |
| TypeScript | ^5.4.0 | Lenguaje |
| Jest + Supertest | ^29 / ^7 | Tests unitarios (12 tests, mock en memoria) |

### Infraestructura
| Recurso | Proveedor |
|---------|---------|
| Base de datos | Firestore (NoSQL) |
| Auth | Firebase Authentication (Google Sign-In) |
| Hosting | Firebase Hosting (pendiente) |
| Functions | Firebase Cloud Functions (us-central1) |

## Estado Actual del Proyecto (2026-03-25)

| Componente | Estado |
|-----------|--------|
| API REST CRUD facturas (functions) | ✅ Completo, 12 tests pasando |
| API REST CRUD clientes (functions) | ✅ Completo, 12 tests pasando |
| Frontend (dashboard, editor, preview) | ✅ Completo |
| Módulo Clientes (CRUD + selector en factura) | ✅ Completo |
| Módulo Perfil de usuario (localStorage + auto-fill) | ✅ Completo |
| Sección Acerca de (versión dinámica + contacto) | ✅ Completo |
| Google Auth (login/logout) | ✅ Completo |
| Multi-ambiente (dev/qa/prod) | ✅ Código listo — Firebase projects pendientes |
| Deploy a producción | ⏳ Bloqueado — requiere plan Blaze en Firebase |

## Pendientes del Usuario
1. Crear proyectos Firebase `invoicer-dev` e `invoicer-qa` en Firebase Console
2. Habilitar Firebase Authentication → Google provider en cada proyecto
3. Actualizar `app/src/environments/environment.qa.ts` con las claves reales de QA
4. Activar plan Blaze en `invoicer-6a7c2` (prod) para poder deployar Functions
