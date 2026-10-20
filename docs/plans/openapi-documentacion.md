# Plan: Documentación OpenAPI 3 de la API de Resttek

**Tipo:** feature
**Tiempo total estimado:** 85 min

## Objetivo

Describir el funcionamiento de la API en un contrato OpenAPI 3 (`openapi.yaml`) fiel al código actual, para tener una fuente de verdad. Después, generar a partir de él un HTML estático de documentación con un script, para poder publicarlo.

## Contexto y supuestos

- Archivos implicados:
  - Rutas: `packages/api/src/app.ts`, `packages/api/src/routes/*.routes.ts`, `packages/api/src/contexts/employee/infrastructure/http/*.routes.ts`
  - Controladores y modelos: `packages/api/src/controllers/*.controller.ts`, `packages/api/src/models/*.model.ts`
  - Errores y autenticación: `packages/api/src/contexts/shared/infrastructure/http/errorHandler.ts`, `middlewares.ts`
  - Salida: `packages/api/openapi.yaml` (nuevo) y `packages/api/docs-dist/index.html`
- Hallazgo: el script para el HTML ya existe, aunque el YAML no.
  - `packages/api/package.json` define `docs:lint` y `docs:build`, que usan `@redocly/cli`, ya instalado.
  - El script raíz `docs:api` los invoca.
  - Existe un `docs-dist/index.html` generado el 19/oct, titulado "Resttek API".
  - Falta `packages/api/openapi.yaml`, así que ambos scripts fallan hoy o el HTML está obsoleto.
  - Por eso no se crea un script nuevo: se verifica y se ajusta el existente.
- Supuestos:
  - Redocly es la herramienta de generación del HTML.
  - El YAML se escribe a mano, no se genera desde el código.
  - Servidor base: `http://localhost:3000/api/v1`; `/health` queda fuera de `/api/v1`.
  - Autenticación: JWT Bearer, 8 h, payload `{id, role, restaurantId}`.
  - Roles: `admin`, `manager`, `camarero`, `cocinero`, `cliente`.
  - Los endpoints públicos (`/public/restaurants*`) no llevan seguridad.
- Riesgos:
  - El formato de error es inconsistente:
    - `errorHandler` devuelve `{error, message}`.
    - `OrderController` y los middlewares devuelven `{error}`.
    - El contrato debe reflejar ambos formatos, no idealizarlos.
  - `OrderController` devuelve 400 donde otros devuelven 404.
  - Hay dos reglas de montaje de rutas con el mismo prefijo `/public/restaurants`.
  - Los cuerpos de login, registro y empleados no se han leído aún (tarea 1).
  - Con 5 min por endpoint, tocará dividir las tareas de endpoints si crecen.
  - `docs-dist/` puede no estar en `.gitignore`; no hay repo git, así que hay que decidir si se versiona.

## Tareas

Las tareas 1-2 son secuenciales. Las tareas 3-8 pueden hacerse en paralelo, porque cada una añade secciones distintas al YAML. Las tareas 9 en adelante van en orden.

| # | Tarea | Archivos | Estimación | Verificación |
|---|-------|----------|-----------|--------------|
| 1 | Leer `AuthController`, `EmployeeController` y los controladores de restaurante e ingrediente. Anotar cuerpos, respuestas y códigos de estado de cada endpoint. | `contexts/employee/infrastructure/**`, `controllers/restaurant.controller.ts`, `controllers/ingredient.controller.ts` | 10 min | Hay una lista de los ~29 endpoints con método, ruta, rol y códigos |
| 2 | Crear el esqueleto de `openapi.yaml`: `openapi: 3.0.3`, `info`, `servers`, `tags`, `securitySchemes` (bearerAuth) y `components.schemas` de error (`Error`, `DomainError`). | `packages/api/openapi.yaml` (nuevo) | 8 min | `npm run docs:lint -w @resttek/api` valida el esqueleto |
| 3 | Documentar Auth y Employees: `/auth/login`, `/auth/register`, `/employees`, `/employees/{id}` y `/restaurants/{restaurantId}/employees`, con esquemas y roles. | `openapi.yaml` | 10 min | El lint pasa y los 5 endpoints aparecen con su seguridad |
| 4 | Documentar Restaurants (privados y públicos): `/restaurants`, `/restaurants/{id}`, `/public/restaurants`, `/public/restaurants/{id}`, con el esquema `Restaurant`. | `openapi.yaml` | 10 min | Lint OK; los públicos tienen `security: []` |
| 5 | Documentar Ingredients (CRUD) con el esquema `Ingredient` y el enum `unit` (`kg`, `g`, `l`, `ml`, `unidad`). | `openapi.yaml` | 8 min | Lint OK; los roles coinciden con `ingredient.routes.ts` |
| 6 | Documentar Dishes (CRUD) y `/public/restaurants/{restaurantId}/dishes`, con el esquema `Dish`, el enum `category` y `DishIngredient`. | `openapi.yaml` | 10 min | Lint OK; el endpoint público indica que solo devuelve platos disponibles |
| 7 | Documentar Orders: `POST /orders`, `GET /orders/active`, `/orders/mine`, `/orders/{id}`, `PATCH /orders/{orderId}/items/{itemId}/status`, con enum de estados y respuestas 400/404 reales. | `openapi.yaml` | 10 min | Lint OK; el 400 de `updateItemStatus` y el 204 están reflejados |
| 8 | Documentar `/health` (fuera de `/api/v1`, con `servers` propio) y las respuestas comunes 401 y 403 como `components.responses` reutilizables. | `openapi.yaml` | 5 min | Lint OK; todos los endpoints protegidos referencian 401 y 403 |
| 9 | Ejecutar `docs:lint` y corregir errores o advertencias. Cruzar la lista de endpoints de la tarea 1 con las `paths` del YAML. | `openapi.yaml` | 8 min | Lint sin errores; los endpoints coinciden uno a uno |
| 10 | Revisar `docs:build` y regenerar el HTML: comprobar `--output docs-dist/index.html` y añadir un `docs:build` raíz si falta (ya existe `docs:api`). | `packages/api/package.json`, `package.json` | 7 min | `npm run docs:api` genera `docs-dist/index.html` sin errores |
| 11 | Abrir el HTML generado y comprobar tags, seguridad y ejemplos. Decidir si `docs-dist/` se versiona o se añade a `.gitignore`. | `packages/api/docs-dist/index.html` | 7 min | Se ven todos los grupos de endpoints y el botón de autorización |
| 12 | Documentar el flujo en la documentación del proyecto: comandos `docs:lint`, `docs:api` y cómo publicar el HTML. | `docs/arquitectura/arquitectura-api.md`, `README.md` | 7 min | Las secciones nuevas listan los comandos y la ruta de salida |

## Criterios de aceptación

- [ ] `packages/api/openapi.yaml` existe y es un documento OpenAPI 3 válido (`npm run docs:lint -w @resttek/api` sin errores).
- [ ] Cada ruta de `app.ts` y de los `*.routes.ts` aparece en el YAML con el método, el rol y los códigos de respuesta reales.
- [ ] Los endpoints públicos no exigen autenticación y los privados declaran `bearerAuth`.
- [ ] Los esquemas `Restaurant`, `Ingredient`, `Dish`, `Order` y `OrderItem` coinciden con los modelos del código, incluidos los enums.
- [ ] Los dos formatos de error (`{error}` y `{error, message}`) están documentados.
- [ ] `npm run docs:api` genera `packages/api/docs-dist/index.html` a partir del YAML, sin intervención manual.
- [ ] El HTML se abre en un navegador sin servidor y muestra todos los grupos de endpoints.
- [ ] La documentación del proyecto explica cómo regenerar y publicar el HTML.
- [ ] Los tests existentes siguen pasando (`npm test`), porque no se toca código de producción.
