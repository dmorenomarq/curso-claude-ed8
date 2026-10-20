---
name: implement-plan
description: Implementa un plan de docs/plans/ (generado con plan-feature) en un git worktree nuevo, tarea a tarea con TDD estricto, haciendo un commit por tarea y marcándola como hecha en el plan hasta cumplir los criterios de aceptación. Úsala cuando el usuario pida implementar, ejecutar o desarrollar un plan.
argument-hint: "[ruta del plan, p. ej. docs/plans/feature-listado-paginado.md]"
allowed-tools: Read, Edit, Write, Grep, Glob, AskUserQuestion, Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git worktree:*), Bash(git add:*), Bash(git commit:*), Bash(cp:*), Bash(ln:*), Bash(npm install:*), Bash(node:*)
---

Implementa el plan indicado, siguiendo los pasos de abajo en orden.

Plan a implementar: $ARGUMENTS

## 1. Preparación

1. **Localiza el plan.** Si no se indicó ruta, lista `docs/plans/` y pregunta con `AskUserQuestion` cuál implementar. Léelo entero. Debe tener las secciones **Objetivo**, **Tareas** y **Criterios de aceptación**; si no las tiene, díselo al usuario y termina.
2. **Detecta el avance previo.** Si ya hay tareas marcadas con `[x]` en la columna `Hecha`, empieza por la primera sin marcar. Si no hay columna `Hecha`, añádela en la copia del worktree (con `[ ]` en cada fila) antes de empezar.
3. **Crea el worktree** (nunca trabajes en el directorio principal):
   - Rama: `<tipo>/<slug>`, tomando `<tipo>` y `<slug>` del nombre del plan (`docs/plans/refactor-middleware-errores.md` → `refactor/middleware-errores`).
   - Ruta: `.claude/worktrees/<slug>`, dentro del repositorio. Comprueba que `.claude/worktrees/` está en `.gitignore` (`git check-ignore .claude/worktrees`); si no, añádelo y avisa al usuario de que ese cambio queda pendiente de commit en el repositorio principal.
   - Comando: `git worktree add -b <rama> <ruta>` partiendo de `HEAD`. Si la rama o la ruta ya existen, no las pises: pregunta al usuario si reutilizarlas o usar otro nombre.
   - A partir de aquí, **todos los comandos y ediciones se hacen dentro del worktree**.
4. **Lleva al worktree lo que git no versiona:**
   - Si el plan no está versionado (o tiene cambios sin commitear) en el repositorio principal, cópialo al worktree en la misma ruta. Se incluirá en el primer commit.
   - Copia `.env` al worktree si existe (no se versiona; nunca lo añadas a un commit).
   - Ejecuta `npm install` en el worktree.
5. **Comprueba la base.** Si hay pruebas (`node --test`), ejecútalas antes de tocar nada para conocer el estado de partida. Si ya fallan, avisa al usuario y pregunta si continuar.

## 2. Bucle por tarea

Haz las tareas **una a una, en el orden del plan**. No empieces la siguiente hasta terminar el ciclo completo de la actual.

### TDD estricto: rojo, verde, refactor

Para cada tarea que cambie código:

1. **Rojo.** Escribe primero la prueba (`node:test` y `node:assert`, junto al código o en la ruta que indique el plan). Ejecútala con `node --test <archivo>` y **comprueba que falla, y por el motivo esperado** (falta la funcionalidad, no un error de sintaxis o de importación). No escribas código de producción sin una prueba en rojo que lo pida.
2. **Verde.** Escribe el código **mínimo** que hace pasar la prueba. Nada de funcionalidad que ninguna prueba exija.
3. **Refactor.** Con las pruebas en verde, limpia el código y las pruebas. Vuelve a ejecutar todo `node --test` y comprueba que sigue en verde.

Casos especiales:

- **El plan separa pruebas y código** (por ejemplo, una tarea de pruebas después de la de código): escribe igualmente la prueba antes del código, dentro de la tarea de código. Al llegar a la tarea de pruebas, completa lo que falte y no la saltes.
- **Refactor sin comportamiento nuevo:** primero asegura que existen pruebas que fijan el comportamiento actual (escríbelas y compruébalas en verde); después haz el cambio y vuelve a pasarlas.
- **Fix:** la prueba en rojo reproduce el error; el verde lo corrige.
- **Tarea sin código** (verificación manual con la API arrancada, documentación…): no hay ciclo de TDD. Haz lo que pide, anota el resultado y, si no genera cambios en archivos, haz solo el commit de marcar la tarea.

### Cierre de la tarea

Cuando la tarea y sus pruebas estén en verde:

1. Ejecuta **todo** `node --test` y comprueba que no hay regresiones.
2. **Marca la tarea como hecha** en el plan del worktree: cambia `[ ]` por `[x]` en la columna `Hecha` de su fila.
3. **Haz un commit** con el código, las pruebas y la marca del plan juntos:
   - Sigue las convenciones de [.claude/commands/commit.md](../../commands/commit.md): Conventional Commits en español, `tipo(ámbito): descripción` en imperativo, minúscula inicial, sin punto final y máximo 72 caracteres. El tipo sale del plan (`feature` → `feat`, `fix` → `fix`, `refactor` → `refactor`).
   - Añade solo los archivos de la tarea con `git add <archivos>` (nunca `git add -A`) y nunca `.env`, `*.db` ni `node_modules`.
   - No pidas confirmación del mensaje: aquí el usuario ya ha pedido un commit por tarea. Termina el mensaje con la línea de coautoría que indique la configuración de la sesión.
   - No uses `--amend`, `--no-verify` ni `push`.
4. Pasa a la siguiente tarea.

### Si algo se atasca

- Si una tarea resulta mucho mayor de lo previsto, o el plan es incorrecto (un método no existe, el orden no funciona), **para** y explícaselo al usuario. No cambies el plan en silencio: si lo corriges, hazlo en el plan y deja constancia en el commit.
- Si una prueba no se puede poner en verde tras varios intentos razonables, para y pide ayuda; no marques la tarea como hecha.

## 3. Criterios de aceptación

Cuando todas las tareas estén marcadas:

1. Ejecuta todo `node --test` y, si el plan lo exige, arranca la API en el worktree para comprobar el comportamiento real.
2. Revisa **uno por uno** los criterios de aceptación del plan, con evidencia (salida de pruebas, respuesta de la API, lectura del código). Marca `[x]` solo los que cumplan de verdad.
3. Si algún criterio no se cumple, añade las tareas necesarias al plan (de 5-10 minutos cada una) y vuelve al bucle del paso 2. Repite hasta que todos se cumplan.
4. Haz un último commit `docs(plan): marca los criterios de aceptación` (o similar) con el plan actualizado.

## 4. Cierre

- No hagas `push`, merge ni borres el worktree: eso lo decide el usuario.
- Resume en pocas líneas: rama y ruta del worktree, commits creados (`git log --oneline` desde la base), estado de las pruebas y de cada criterio de aceptación, y cualquier desviación del plan.
- Indica que, para integrarlo, el usuario puede hacer merge de la rama y eliminar el worktree con `git worktree remove <ruta>`.

## Estilo

- Escribe en español y sé breve: informa de cada tarea terminada en una línea (número, commit, pruebas en verde).
