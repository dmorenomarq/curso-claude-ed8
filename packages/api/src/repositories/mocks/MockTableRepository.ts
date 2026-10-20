import type { TableFilters, TableRepository } from '@repositories/table.repository.js'
import type { Table } from '@models/table.model.js'

export class MockTableRepository implements TableRepository {
    tables: Table[] = []

    async create(table: Table): Promise<void> {
        this.tables.push({ ...table })
    }

    async findById(id: string): Promise<Table | null> {
        const table = this.tables.find(t => t.id === id)
        return table ? { ...table } : null
    }

    async findByRestaurantAndNumber(restaurantId: string, number: number): Promise<Table | null> {
        const table = this.tables.find(t => t.restaurantId === restaurantId && t.number === number)
        return table ? { ...table } : null
    }

    async findByRestaurant(restaurantId: string, filters: TableFilters = {}): Promise<Table[]> {
        const matching = this.tables
            .filter(t => t.restaurantId === restaurantId)
            .filter(t => !filters.status || t.status === filters.status)
            .filter(t => filters.minCapacity === undefined || t.capacity >= filters.minCapacity)
            .sort((a, b) => a.number - b.number)
        const offset = filters.offset ?? 0
        const end = filters.limit === undefined ? undefined : offset + filters.limit
        return matching.slice(offset, end).map(t => ({ ...t }))
    }

    async update(table: Table): Promise<void> {
        const index = this.tables.findIndex(t => t.id === table.id)
        if (index >= 0) this.tables[index] = { ...table }
    }

    async delete(id: string): Promise<void> {
        this.tables = this.tables.filter(t => t.id !== id)
    }

    async findAvailable(restaurantId: string, partySize: number): Promise<Table[]> {
        return this.tables
            .filter(t => t.restaurantId === restaurantId && t.status === 'libre' && t.capacity >= partySize)
            .sort((a, b) => a.capacity - b.capacity || a.number - b.number)
            .map(t => ({ ...t }))
    }

    async findByClient(restaurantId: string, clientId: string): Promise<Table | null> {
        const table = this.tables.find(t =>
            t.restaurantId === restaurantId && t.status === 'ocupada' && t.occupiedByClientId === clientId
        )
        return table ? { ...table } : null
    }

    async occupy(id: string, partySize: number, clientId: string | null, occupiedAt: string): Promise<boolean> {
        const table = this.tables.find(t => t.id === id)
        if (!table || table.status !== 'libre' || table.capacity < partySize) return false
        Object.assign(table, {
            status: 'ocupada', partySize, occupiedByClientId: clientId, occupiedAt, updatedAt: occupiedAt
        })
        return true
    }

    async release(id: string, updatedAt: string): Promise<void> {
        const table = this.tables.find(t => t.id === id)
        if (!table) return
        Object.assign(table, {
            status: 'libre', partySize: null, occupiedByClientId: null, occupiedAt: null, updatedAt
        })
    }
}
