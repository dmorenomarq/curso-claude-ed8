import type { TableApiError } from './table.model'

interface HttpErrorLike {
  status?: number
  error?: Partial<TableApiError> | null
}

export function tableErrorMessage(err: unknown, fallback: string): string {
  const { status, error } = (err ?? {}) as HttpErrorLike
  if (error?.message) return error.message
  if (status === 0) return 'No se pudo conectar con el servidor.'
  if (status === 403) return 'No tienes permisos para realizar esta acción.'
  if (status === 404) return 'La mesa no existe.'
  return fallback
}

export function isTableInUse(err: unknown): boolean {
  const { status, error } = (err ?? {}) as HttpErrorLike
  return status === 409 && error?.error === 'TableInUseError'
}
