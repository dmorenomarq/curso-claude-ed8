---
name: plan-feature
description: Planifica un nuevo desarrollo, una corrección de código (bug) o un refactor, generando un plan con objetivo, tareas de 5-10 minutos y criterios de aceptación. Úsala cuando el usuario pida planificar, diseñar o desglosar un cambio antes de implementarlo.
argument-hint: "[descripción del desarrollo, corrección o refactor]"
allowed-tools: Read, Grep, Glob, Write, Bash(git log:*), Bash(git status:*), Bash(git diff:*)
---

Planifica el cambio que describe el usuario. **No implementes nada**: el resultado es solo el plan (que se guarda en `docs/plans/`).

Cambio a planificar: $ARGUMENTS

## Pasos

1. **Entiende la petición.** Identifica si es un `feature` (desarrollo nuevo), un `fix` (corrección) o un `refactor`. Si la petición es ambigua en algo que cambia el plan de forma sustancial, pregunta al usuario con `AskUserQuestion` antes de seguir; si hay un valor por defecto razonable, úsalo y anótalo como supuesto.
2. **Explora el código** con `Read`, `Grep` y `Glob` para basar el plan en lo que existe de verdad: qué archivos se tocan, qué clases y métodos se reutilizan, qué patrones hay que imitar. No inventes archivos ni métodos.
3. **Respeta las convenciones del proyecto** (`CLAUDE.md`) al definir las tareas:
   - Arquitectura por capas `routes → controllers → services → repositories → models`; cada capa solo habla con la inmediatamente inferior.
   - Clases con métodos en `snake_case`, CommonJS, sin librerías externas si hay solución nativa de Node, SQLite solo desde repositories con `node:sqlite`.
   - Si el cambio crea o modifica un endpoint que devuelve un listado, lee `docs/api/pagination.md` y aplica sus convenciones.
   - Las variables de entorno se leen solo en `src/config.js`.
4. **Redacta el plan** siguiendo exactamente la estructura de [templates.md](templates.md). Usa la plantilla del tipo que corresponda y no añadas ni quites secciones.
5. **Guarda el plan** en `docs/plans/<tipo>-<slug>.md` (crea la carpeta si no existe), donde `<tipo>` es `feature`, `fix` o `refactor` y `<slug>` es un resumen corto en minúsculas, con guiones y sin tildes (por ejemplo `docs/plans/refactor-middleware-errores.md`). Si ya existe un archivo con ese nombre, no lo sobrescribas sin avisar al usuario.
6. **Muestra el plan** al usuario en la conversación e indica la ruta del archivo guardado.

## Reglas para las tareas

- **Duración:** cada tarea debe poder hacerse en **5-10 minutos**. Si una tarea parece mayor, divídela. Si es menor de unos 5 minutos, agrúpala con otra relacionada.
- **Una sola intención:** cada tarea hace una cosa concreta y verificable (por ejemplo, "añadir `find_by_id` en `VendehumoRepository`"), no "implementar el servicio".
- **Orden de ejecución:** ordénalas de modo que cada una pueda hacerse con lo anterior ya terminado. Para el código nuevo, ve de abajo arriba por las capas (models → repositories → services → controllers → routes).
- **Concretas:** indica el archivo o los archivos afectados y el método o clase cuando se conozcan.
- **Estimación:** indica el tiempo de cada tarea en minutos (entre 5 y 10).
- **Pruebas:** hoy no hay test runner configurado; si el plan incluye pruebas, usa `node:test` y `node:assert` y dedica tareas propias a ellas.

## Reglas para los criterios de aceptación

- Deben ser **comprobables**: alguien debe poder decir sí o no tras revisarlos.
- Cubren el comportamiento esperado, los casos de error (códigos de estado HTTP, mensajes) y el cumplimiento de las convenciones del proyecto.
- Evita criterios vagos como "funciona bien" o "el código es limpio".

## Estilo

- Escribe en español.
- Sé breve: el plan debe poder leerse de un vistazo.
