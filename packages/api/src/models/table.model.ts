import { InvalidTableError } from '@errors/DomainErrors.js'
import type { Order } from '@models/order.model.js'

const VALID_TABLE_STATUSES = ['libre', 'ocupada', 'reservada'] as const

export type TableStatusType = typeof VALID_TABLE_STATUSES[number]

export interface Table {
    id: string
    restaurantId: string
    number: number
    description: string | null
    capacity: number
    status: TableStatusType
    partySize: number | null
    occupiedByClientId: string | null
    occupiedAt: string | null
    createdAt: string
    updatedAt: string
    activeOrders?: Order[]
}

export function normalizeTableStatus(value: string): TableStatusType {
    if (typeof value !== 'string') {
        throw new InvalidTableError(`Estado de mesa inválido. Debe ser uno de: ${VALID_TABLE_STATUSES.join(', ')}`)
    }
    const normalized = value.trim().toLowerCase()
    if (!VALID_TABLE_STATUSES.includes(normalized as TableStatusType)) {
        throw new InvalidTableError(`Estado de mesa inválido: ${value}. Debe ser uno de: ${VALID_TABLE_STATUSES.join(', ')}`)
    }
    return normalized as TableStatusType
}

export function validateTableNumber(value: unknown): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
        throw new InvalidTableError('El número de mesa debe ser un entero mayor o igual que 1')
    }
    return value
}

export function validateTableCapacity(value: unknown): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
        throw new InvalidTableError('La capacidad debe ser un entero mayor o igual que 1')
    }
    return value
}
