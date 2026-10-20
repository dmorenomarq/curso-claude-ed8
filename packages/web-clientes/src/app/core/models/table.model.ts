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
