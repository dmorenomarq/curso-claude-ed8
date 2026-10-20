# Plan: Gestión de mesas

**Tipo:** feature
**Tiempo total estimado:** 297 min (API 149, web-admin 52, web-empleados 50, web-clientes 46; en paralelo ~150 min de reloj)

## Objetivo

Que el administrador gestione las mesas de un restaurante (CRUD), que el cliente indique el nº de personas, vea las mesas libres con capacidad suficiente y ocupe una antes de pedir, y que el personal vea y cambie el estado de las mesas y los pedidos de las ocupadas. El contrato está cerrado en `packages/api/gestion-mesas.openapi.yaml` (issue #5) y es la fuente de verdad de rutas, roles y errores.

**Supuestos:** el repo es TypeScript (Express + sqlite3 + vitest en la API; Angular en los fronts), así que se siguen sus convenciones reales y no las de `plan-feature` pensadas para otro proyecto. Tabla SQL `restaurant_tables`. Cada front replica `Table` en su propio `models/`, sin tocar `web-shared`. Los tests de API usan los mocks de `repositories/mocks/`. Las tareas `[API]` van en orden de capas (models → repositories → services → controllers → routes); `[ADM]`, `[EMP]` y `[CLI]` solo dependen del yaml y avanzan en paralelo con la API.
**Fuera de alcance:** reservas con fecha/hora, zonas o plantas, liberación automática al entregar pedidos, cambios en `openapi.yaml` principal.

## Tareas

| # | Tarea | Archivos | Min | Hecha |
|---|-------|----------|-----|-------|
| 1 | [API] Migración: tabla `restaurant_tables` (id, restaurant_id, number único por restaurante, description, capacity, status, party_size, occupied_by_client_id, occupied_at, created_at, updated_at) | `packages/api/src/config/database.ts` | 8 | [x] |
| 2 | [API] Modelo `Table`, `TableStatus` y validación (capacidad ≥ 1, número ≥ 1, estado válido) con test | `packages/api/src/models/table.model.ts`, `table.model.test.ts` | 8 | [x] |
| 3 | [API] Errores de dominio: `InvalidTableError`, `TableNotFoundError`, `DuplicatedTableNumberError`, `TableInUseError` (con `reason` y `pendingItems`) | `packages/api/src/errors/DomainErrors.ts`, `contexts/shared/infrastructure/http/errorHandler.ts` | 8 | [x] |
| 4 | [API] Errores de ocupación: `TableNotAvailableError`, `ClientAlreadySeatedError` (con `tableId`), `InvalidPartySizeError`, `TableNotOccupiedError`, `TableNotOccupiedByClientError` | `packages/api/src/errors/DomainErrors.ts`, `errorHandler.ts` | 6 | [x] |
| 5 | [API] Repositorio: interfaz `TableRepository` y CRUD SQLite (`create`, `findById`, `findByRestaurant` con `status`/`minCapacity`, `update`, `delete`) con test | `packages/api/src/repositories/table.repository.ts`, `table.repository.test.ts` | 10 | [x] |
| 6 | [API] Repositorio: `findAvailable(restaurantId, partySize)`, `findByClient`, `occupy` atómico (UPDATE condicionado a `status='libre'`) y `release` con test | `packages/api/src/repositories/table.repository.ts`, `table.repository.test.ts` | 10 | [x] |
| 7 | [API] `MockTableRepository` para los tests de servicio | `packages/api/src/repositories/mocks/MockTableRepository.ts` | 5 | [x] |
| 8 | [API] Servicio: CRUD (`create`, `get_all`, `get_by_id`, `update`, `delete`) con número duplicado (409) y borrado de mesa ocupada/reservada (409), con test | `packages/api/src/services/table.service.ts`, `table.service.test.ts` | 10 | [x] |
| 9 | [API] Servicio: `update_status` (cualquier transición, idempotente, `force` solo admin/manager, 409 `TableInUseError` si hay líneas sin entregar al pasar a libre; a `ocupada` deja `partySize`/cliente a null) con test | `packages/api/src/services/table.service.ts`, `table.service.test.ts` | 10 | [x] |
| 10 | [API] Servicio: `list_available`, `get_mine`, `occupy` (idempotente para el mismo cliente, 409 `TableNotAvailableError`/`ClientAlreadySeatedError`) y `release` por el cliente ocupante, con test | `packages/api/src/services/table.service.ts`, `table.service.test.ts` | 10 | [x] |
| 11 | [API] Repositorio y servicio de pedidos: `findByTable` (ocupación actual, `createdAt >= occupiedAt`), `activeOrders` de mesas ocupadas e `include=activeOrders` con test | `packages/api/src/repositories/order.repository.ts`, `services/table.service.ts` | 10 | [x] |
| 12 | [API] `Order.tableNumber` en modelo y respuestas de `/orders/*` | `packages/api/src/models/order.model.ts`, `repositories/order.repository.ts` | 8 | [x] |
| 13 | [API] `OrderService.create_order`: validar `tableId` (404 si no existe o es de otro restaurante; 409 si no está ocupada o no la ocupa ese cliente) con test | `packages/api/src/services/order.service.ts`, `order.service.test.ts` | 10 | [x] |
| 14 | [API] Controlador de mesas con códigos de estado (201/200/204, query params, `force`) | `packages/api/src/controllers/table.controller.ts` | 10 | [x] |
| 15 | [API] Rutas con `authorize` por rol según el yaml (`/available` y `/mine` antes de `/:id`; filtro de `restaurantId` del JWT para no admin) y montaje en `app.ts` | `packages/api/src/routes/table.routes.ts`, `packages/api/src/app.ts` | 10 | [x] |
| 16 | [API] Test de integración (supertest o equivalente del repo) del flujo cliente: available → occupy → `POST /orders` y carrera 409 | `packages/api/src/routes/table.routes.test.ts` | 10 | [ ] |
| 17 | [API] Seed con mesas de ejemplo y comprobación del yaml con `redocly lint` | `packages/api/src/scripts/seed.ts`, `packages/api/gestion-mesas.openapi.yaml` | 6 | [ ] |
| 18 | [ADM] Modelo `Table`/`TableStatus` y `TableService` (CRUD y `PATCH` de estado con `force`) con test | `packages/web-admin/src/app/features/tables/models/table.model.ts`, `services/table.service.ts` | 10 | [ ] |
| 19 | [ADM] `TableStore` (loading, error, filtros por estado y capacidad) con test | `packages/web-admin/src/app/features/tables/store/table.store.ts` | 8 | [ ] |
| 20 | [ADM] Listado con filtros y columna de ocupación (`partySize`, `occupiedAt`) | `packages/web-admin/src/app/features/tables/table-list/` | 10 | [ ] |
| 21 | [ADM] Formulario crear/editar con validaciones y mensajes de error 400/409 en español | `packages/web-admin/src/app/features/tables/table-form/` | 10 | [ ] |
| 22 | [ADM] Borrado con confirmación, diálogo de cambio de estado con `force` y errores `TableInUseError` | `packages/web-admin/src/app/features/tables/` | 8 | [ ] |
| 23 | [ADM] Rutas lazy `tables`, `tables/new`, `tables/:id/edit` y entrada en el menú | `packages/web-admin/src/app/app.routes.ts`, `core/layout/` | 6 | [ ] |
| 24 | [EMP] `Order.tableNumber`, modelo `Table` y `TableService` (`GET` con `include=activeOrders`, `PATCH` de estado, pedidos de la mesa) con test | `packages/web-empleados/src/app/features/tables/models/`, `services/`, `features/orders/models/order.model.ts` | 10 | [ ] |
| 25 | [EMP] `TableStore` con polling de 30 s según el patrón de `OrderStore` con test | `packages/web-empleados/src/app/features/tables/store/table.store.ts` | 10 | [ ] |
| 26 | [EMP] Pantalla de salón: mesas por estado con selector de estado y forzado para manager ante `TableInUseError` | `packages/web-empleados/src/app/features/tables/table-board/` | 10 | [ ] |
| 27 | [EMP] Detalle de mesa ocupada con los pedidos y el estado de cada línea | `packages/web-empleados/src/app/features/tables/table-detail/` | 10 | [ ] |
| 28 | [EMP] Rutas, entrada de menú para camarero y manager (cocinero solo lectura) y «Mesa N» en cocina, barra y salón | `packages/web-empleados/src/app/app.routes.ts`, `core/layout/`, `features/orders/` | 10 | [ ] |
| 29 | [CLI] Modelo `Table`, `Order.tableNumber` y `TableService` (`available?partySize`, `mine`, `occupy`, `release`) con test | `packages/web-clientes/src/app/core/models/`, `core/services/table.service.ts` | 10 | [ ] |
| 30 | [CLI] Guardar el `tableId` en `CartStore` y enviarlo en `OrderService.createOrder` (hoy manda `null`) con test | `packages/web-clientes/src/app/core/store/`, `core/services/order.service.ts` | 8 | [ ] |
| 31 | [CLI] Pantalla «personas y mesas» entre `restaurant-list` y `restaurants/:id`: número de personas, mesas disponibles y botón «Continuar» que ocupa | `packages/web-clientes/src/app/features/tables/`, `app.routes.ts` | 10 | [ ] |
| 32 | [CLI] Errores en pantalla (`TableNotAvailableError` refresca la lista, `ClientAlreadySeatedError` continúa con su `tableId`, 400 `InvalidPartySizeError`) | `packages/web-clientes/src/app/features/tables/` | 8 | [ ] |
| 33 | [CLI] Guardia de mesa en carta y carrito (recupera con `/tables/mine` al recargar), botón «Liberar mesa» y número de mesa en `my-orders`/`order-detail` | `packages/web-clientes/src/app/app.routes.ts`, `features/menu/`, `features/cart/`, `features/orders/` | 10 | [ ] |

## Criterios de aceptación

- [ ] Todos los endpoints de `gestion-mesas.openapi.yaml` existen con los roles, códigos y cuerpos de error descritos (comprobado con tests de integración).
- [ ] `POST /restaurants/{id}/tables` con número repetido en el mismo restaurante devuelve 409 `DuplicatedTableNumberError`; con capacidad < 1 devuelve 400 `InvalidTableError`.
- [ ] `DELETE` de una mesa ocupada o reservada devuelve 409 `TableInUseError`; de una libre devuelve 204.
- [ ] `GET /tables/available?partySize=N` solo devuelve mesas `libre` con `capacity >= N`, ordenadas por capacidad y número; `partySize` inválido devuelve 400 `InvalidPartySizeError`.
- [ ] Dos `occupy` simultáneos sobre la misma mesa: uno responde 200 y el otro 409 `TableNotAvailableError`; repetir el mismo cliente sobre la misma mesa responde 200.
- [ ] `PATCH .../status` a `libre` con líneas sin entregar devuelve 409 `TableInUseError` con `pendingItems`, salvo con `?force=true` de admin o manager.
- [ ] `POST /orders` con `tableId` de una mesa no ocupada devuelve 409 y la respuesta de `Order` incluye `tableNumber`.
- [ ] Un empleado que no es admin recibe 403 al operar sobre otro restaurante; un cocinero no puede crear, cambiar estado ni ocupar.
- [ ] Flujo cliente en `web-clientes`: elegir restaurante → nº de personas → mesas → «Continuar» → carta; sin mesa no se puede llegar a la carta ni enviar el pedido.
- [ ] `web-admin` permite listar, filtrar, crear, editar y borrar mesas mostrando los mensajes de error en español.
- [ ] `web-empleados` muestra el estado de las mesas, permite cambiarlo y muestra los pedidos de las mesas ocupadas, refrescando cada 30 s.
- [ ] `npm test` en `packages/api` y los tests de cada front pasan; `redocly lint gestion-mesas.openapi.yaml` sin errores.
- [ ] Las capas de la API se respetan (routes → controllers → services → repositories → models) y SQL solo aparece en repositories.
