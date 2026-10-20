# Plantillas de plan

Usa la plantilla que corresponda al tipo de cambio. Las tres comparten la misma estructura: **Objetivo**, **Tareas** y **Criterios de aceptación**. Rellena todos los apartados y sustituye cada texto entre `<...>`.

Cada tarea debe durar **5-10 minutos**.

---

## Plantilla: desarrollo nuevo (feature)

```markdown
# Plan: <título corto del desarrollo>

**Tipo:** feature
**Tiempo total estimado:** <suma de las tareas> min

## Objetivo

<Qué se quiere conseguir y por qué, en 1-3 frases. Indica el resultado visible para quien use la API.>

**Supuestos:** <decisiones tomadas por defecto; omite la línea si no hay>
**Fuera de alcance:** <lo que explícitamente no se hace; omite la línea si no hay>

## Tareas

| # | Tarea | Archivos | Min | Hecha |
|---|-------|----------|-----|-------|
| 1 | <acción concreta y verificable> | `<ruta/archivo.js>` | <5-10> | [ ] |
| 2 | <acción concreta y verificable> | `<ruta/archivo.js>` | <5-10> | [ ] |
| 3 | <acción concreta y verificable> | `<ruta/archivo.js>` | <5-10> | [ ] |

## Criterios de aceptación

- [ ] <comportamiento esperado, comprobable>
- [ ] <caso de error con su código de estado y mensaje>
- [ ] <cumple las convenciones de capas y nombres del proyecto>
```

---

## Plantilla: corrección (fix)

```markdown
# Plan: <título corto del error>

**Tipo:** fix
**Tiempo total estimado:** <suma de las tareas> min

## Objetivo

<Qué falla, cuál es la causa conocida o probable y cuál es el comportamiento correcto, en 1-3 frases.>

**Cómo reproducirlo:** <pasos o petición concreta que provoca el error>
**Fuera de alcance:** <lo que no se toca; omite la línea si no hay>

## Tareas

| # | Tarea | Archivos | Min | Hecha |
|---|-------|----------|-----|-------|
| 1 | Reproducir el error y confirmar la causa | `<ruta/archivo.js>` | <5-10> | [ ] |
| 2 | <corregir la causa de forma concreta> | `<ruta/archivo.js>` | <5-10> | [ ] |
| 3 | <añadir o ajustar una prueba que habría detectado el error> | `<ruta/archivo.test.js>` | <5-10> | [ ] |

## Criterios de aceptación

- [ ] El error ya no se reproduce con los pasos indicados.
- [ ] <el comportamiento correcto esperado, comprobable>
- [ ] <el resto del comportamiento relacionado sigue igual (sin regresiones)>
```

---

## Plantilla: refactor

```markdown
# Plan: <título corto del refactor>

**Tipo:** refactor
**Tiempo total estimado:** <suma de las tareas> min

## Objetivo

<Qué se quiere mejorar en el código (estructura, duplicación, legibilidad…) y por qué, en 1-3 frases. El comportamiento externo de la API no cambia.>

**Fuera de alcance:** <lo que no se toca; omite la línea si no hay>

## Tareas

| # | Tarea | Archivos | Min | Hecha |
|---|-------|----------|-----|-------|
| 1 | <paso pequeño que deja el código funcionando> | `<ruta/archivo.js>` | <5-10> | [ ] |
| 2 | <paso pequeño que deja el código funcionando> | `<ruta/archivo.js>` | <5-10> | [ ] |
| 3 | <paso pequeño que deja el código funcionando> | `<ruta/archivo.js>` | <5-10> | [ ] |

## Criterios de aceptación

- [ ] Las respuestas de la API (cuerpos y códigos de estado) son idénticas a las de antes.
- [ ] <la mejora buscada, comprobable: por ejemplo, ya no hay código duplicado en X>
- [ ] <cumple las convenciones de capas y nombres del proyecto>
```
