export type TableStatus = 'libre' | 'ocupada' | 'reservada'

export interface Table {
  id: string
  restaurantId: string
  number: number
  description: string | null
  capacity: number
  status: TableStatus
  partySize: number | null
  occupiedByClientId: string | null
  occupiedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTableDto {
  number: number
  capacity: number
  description: string | null
  status?: TableStatus
}

export interface TableFilters {
  status?: TableStatus | null
  minCapacity?: number | null
}

export type TableInUseReason = 'ocupada' | 'reservada' | 'pedidos_pendientes'

export interface TableApiError {
  error: string
  message: string
  reason?: TableInUseReason
  pendingItems?: number
}

export const TABLE_STATUSES: TableStatus[] = ['libre', 'ocupada', 'reservada']

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  reservada: 'Reservada'
}
