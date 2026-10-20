---
description: Crea un commit siguiendo las convenciones del proyecto (Conventional Commits en español)
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
---

Crea un commit con los cambios actuales siguiendo estas convenciones.

## Contexto

- Estado: !`git status --short`
- Cambios: !`git diff --cached`
- Commits recientes (para igualar el estilo): !`git log --oneline -10 2>/dev/null || echo "(primer commit)"`

## Convenciones

- **Formato:** `tipo(ámbito): descripción`
- **Tipos:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `style`.
- **Ámbito (opcional):** la capa o módulo afectado (`routes`, `controllers`, `services`, `repositories`, `models`, `utils`, `config`, `auth`, `vendehumo`…). Si el cambio toca varias capas de una misma funcionalidad, usa el nombre de la funcionalidad (por ejemplo `vendehumo`).
- **Descripción:** en español, en imperativo y minúscula inicial, sin punto final, máximo 72 caracteres (por ejemplo `feat(vendehumo): añade listado paginado`).
- **Cuerpo (opcional):** solo si el porqué no es evidente. Separado por una línea en blanco y explicando el motivo, no el qué.
- **Cambios incompatibles:** añade `!` tras el ámbito y un pie `BREAKING CHANGE: ...`.

## Pasos

1. Si no hay cambios, díselo al usuario y termina.
2. No incluyas nunca `.env`, archivos `*.db` ni `node_modules`. Si aparecen en el estado, avisa y déjalos fuera.
3. Si los cambios mezclan propósitos distintos, propón dividirlos en varios commits y pregunta antes de hacerlo.
4. Añade con `git add` solo los archivos relevantes (no uses `git add -A` a ciegas) y crea el commit.
5. No hagas `push`, `--amend` ni `--no-verify`, salvo que el usuario lo pida.
6. Usa la tool `AskUserQuestion` para mostrarle al usuario el mensaje del commit, y que decida si le parece bien. Si te da el ok, continua. Si te dice que no, proponle otro mensaje y vuelve a preguntarle.
7. Muestra al final el mensaje del commit creado.

$ARGUMENTS
