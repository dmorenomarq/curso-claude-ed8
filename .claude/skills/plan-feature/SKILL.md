---
name: plan-feature
description: Planifica un nuevo desarrollo, una corrección de código (bugfix) o un refactor, generando un plan con objetivo, tareas de 5-10 minutos y criterios de aceptación. Úsala cuando el usuario pida planificar, diseñar el enfoque o desglosar en tareas una feature, un fix o un refactor antes de implementarlo.
---

# plan-feature

Genera un plan de trabajo claro y accionable para una feature, corrección o refactor, siguiendo siempre la estructura de [templates.md](templates.md).

## Cuándo usarla

- "Planifica la feature X", "desglosa esta corrección en tareas", "haz un plan para refactorizar Y".
- Antes de implementar cualquier cambio no trivial.

No implementes código: esta skill solo planifica.

## Proceso

1. **Entender la petición.** Identifica el tipo: `feature`, `fix` o `refactor`. Si el objetivo es ambiguo o falta información que cambie el plan de forma sustancial, haz como máximo 1-3 preguntas concretas; si no, asume valores razonables y decláralos en el plan.
2. **Explorar el código.** Revisa los archivos, módulos y tests relacionados antes de planificar (README, estructura, convenciones existentes). Las tareas deben referenciar rutas reales del proyecto, no inventadas.
3. **Redactar el plan** usando exactamente la estructura de `templates.md`.
4. **Validar el plan** con la checklist de abajo antes de entregarlo.
5. **Entregar.** Muestra el plan al usuario. Guárdalo como archivo solo si lo pide (por defecto `docs/plans/<slug>.md`).

## Reglas para las tareas

- Cada tarea debe poder completarse en **5-10 minutos**. Si estimas más, divídela. Si es menos de 5, agrúpala con otra afín.
- Cada tarea es una acción concreta y verificable, empezando por un verbo (Crear, Añadir, Renombrar, Escribir test...).
- Indica los archivos afectados y cómo comprobar que la tarea está hecha.
- Ordénalas por dependencias; marca cuáles pueden hacerse en paralelo si aplica.
- Incluye las tareas de tests y documentación dentro del flujo, no como añadido final vago.
- Por tipo:
  - **fix**: primero reproducir el fallo (test que falla), luego corregir, luego verificar que no hay regresiones.
  - **refactor**: asegurar cobertura de tests previa, cambios pequeños sin alterar comportamiento, verificar tras cada paso.
  - **feature**: contrato/interfaz primero, luego lógica, luego integración, tests y docs.

## Reglas para los criterios de aceptación

- Observables y comprobables (sí/no), formulados como checklist `- [ ]`.
- Cubren el comportamiento esperado, casos límite relevantes y que los tests pasan.
- Para refactors, incluye explícitamente "el comportamiento externo no cambia".

## Checklist de validación

- [ ] Sigue la estructura de `templates.md` sin omitir secciones.
- [ ] El objetivo cabe en 1-3 frases y explica el porqué.
- [ ] Ninguna tarea supera los 10 minutos estimados.
- [ ] Las rutas de archivo mencionadas existen o se marcan como "nuevo".
- [ ] Los criterios de aceptación son verificables.
- [ ] Supuestos y riesgos declarados.
