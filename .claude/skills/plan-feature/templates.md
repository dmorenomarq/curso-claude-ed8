# Plantilla de plan

Usa esta estructura exacta. Elimina los comentarios `<!-- -->` al rellenarla.

---

```markdown
# Plan: <título corto>

**Tipo:** feature | fix | refactor
**Tiempo total estimado:** <suma de las tareas, ej. 45 min>

## Objetivo

<!-- 1-3 frases: qué se quiere conseguir y por qué. -->

## Contexto y supuestos

<!-- Breve: archivos/módulos implicados, decisiones asumidas, riesgos. Omitir si no aporta. -->

- Archivos implicados: `ruta/archivo.ext`, ...
- Supuestos: ...
- Riesgos: ...

## Tareas

<!-- Cada tarea: 5-10 min, acción concreta y verificable. Ordenadas por dependencias. -->

| # | Tarea | Archivos | Estimación | Verificación |
|---|-------|----------|-----------|--------------|
| 1 | <Verbo + acción concreta> | `ruta/archivo` | 5 min | <cómo se comprueba> |
| 2 | ... | ... | 10 min | ... |

## Criterios de aceptación

<!-- Observables y verificables (sí/no). -->

- [ ] <Comportamiento esperado 1>
- [ ] <Caso límite relevante>
- [ ] Los tests existentes y nuevos pasan
- [ ] <Para refactor: el comportamiento externo no cambia>
```

---

## Ejemplo (fix)

```markdown
# Plan: Corregir cálculo de IVA en facturas con descuento

**Tipo:** fix
**Tiempo total estimado:** 30 min

## Objetivo

El IVA se calcula sobre el importe sin descuento, lo que genera facturas con totales incorrectos. Debe calcularse sobre la base imponible ya descontada.

## Contexto y supuestos

- Archivos implicados: `packages/billing/src/invoice.js`, `packages/billing/test/invoice.test.js`
- Supuestos: el descuento se aplica antes del IVA.
- Riesgos: facturas ya emitidas no se recalculan.

## Tareas

| # | Tarea | Archivos | Estimación | Verificación |
|---|-------|----------|-----------|--------------|
| 1 | Escribir test que reproduce el fallo con descuento del 10% | `test/invoice.test.js` | 8 min | El test falla con el código actual |
| 2 | Aplicar el descuento antes de calcular el IVA | `src/invoice.js` | 10 min | El test nuevo pasa |
| 3 | Añadir test de caso límite (descuento 0% y 100%) | `test/invoice.test.js` | 7 min | Ambos tests pasan |
| 4 | Ejecutar la suite completa y revisar regresiones | — | 5 min | Todos los tests en verde |

## Criterios de aceptación

- [ ] Una factura de 100 € con 10% de descuento y 21% de IVA da un total de 108,90 €
- [ ] Descuento 0% y 100% se calculan correctamente
- [ ] Los tests existentes y nuevos pasan
```
