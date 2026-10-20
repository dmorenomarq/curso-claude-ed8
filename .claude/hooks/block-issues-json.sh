#!/bin/bash
# Hook PreToolUse: impide que el agente lea el archivo issues.json.
# Lee el JSON del hook por stdin y busca el nombre del archivo en la ruta,
# el patrón o el comando de la herramienta. Salir con código 2 bloquea la llamada.

entrada=$(jq -r '[.tool_input.file_path, .tool_input.path, .tool_input.pattern, .tool_input.command] | map(select(. != null)) | join(" ")')

if echo "$entrada" | grep -qi 'issues\.json'; then
  echo "Bloqueado: el agente no tiene permitido leer issues.json" >&2
  exit 2
fi

exit 0
