import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableStatusType } from '@models/table.model.js'

interface TableRow {
    id: string
    restaurantId: string
    number: number
    description: string | null
    capacity: number
    status: string
    partySize: number | null
    occupiedByClientId: string | null
    occupiedAt: string | null
    createdAt: string
    updatedAt: string
}

export interface TableFilters {
    status?: TableStatusType
    minCapacity?: number
    limit?: number
    offset?: number
}

export interface TableRepository {
    create(table: Table): Promise<void>
    findById(id: string): Promise<Table | null>
    findByRestaurantAndNumber(restaurantId: string, number: number): Promise<Table | null>
    findByRestaurant(restaurantId: string, filters?: TableFilters): Promise<Table[]>
    update(table: Table): Promise<void>
    delete(id: string): Promise<void>
}

const SELECT_TABLE = `
    SELECT id, restaurant_id as restaurantId, number, description, capacity, status,
           party_size as partySize, occupied_by_client_id as occupiedByClientId,
           occupied_at as occupiedAt, created_at as createdAt, updated_at as updatedAt
    FROM restaurant_tables`

export class SqliteTableRepository implements TableRepository {
    constructor(private readonly db: Database) {}

    async create(table: Table): Promise<void> {
        await this.db.run(
            `INSERT INTO restaurant_tables
                (id, restaurant_id, number, description, capacity, status, party_size,
                 occupied_by_client_id, occupied_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                table.id, table.restaurantId, table.number, table.description, table.capacity, table.status,
                table.partySize, table.occupiedByClientId, table.occupiedAt, table.createdAt, table.updatedAt
            ]
        )
    }

    async findById(id: string): Promise<Table | null> {
        const row = await this.db.get<TableRow>(`${SELECT_TABLE} WHERE id = ?`, [id])
        return row ? this.mapToTable(row) : null
    }

    async findByRestaurantAndNumber(restaurantId: string, number: number): Promise<Table | null> {
        const row = await this.db.get<TableRow>(
            `${SELECT_TABLE} WHERE restaurant_id = ? AND number = ?`,
            [restaurantId, number]
        )
        return row ? this.mapToTable(row) : null
    }

    async findByRestaurant(restaurantId: string, filters: TableFilters = {}): Promise<Table[]> {
        const conditions = ['restaurant_id = ?']
        const params: any[] = [restaurantId]

        if (filters.status) {
            conditions.push('status = ?')
            params.push(filters.status)
        }
        if (filters.minCapacity !== undefined) {
            conditions.push('capacity >= ?')
            params.push(filters.minCapacity)
        }

        let sql = `${SELECT_TABLE} WHERE ${conditions.join(' AND ')} ORDER BY number ASC`
        if (filters.limit !== undefined) {
            sql += ' LIMIT ? OFFSET ?'
            params.push(filters.limit, filters.offset ?? 0)
        } else if (filters.offset) {
            sql += ' LIMIT -1 OFFSET ?'
            params.push(filters.offset)
        }

        const rows = await this.db.all<TableRow>(sql, params)
        return rows.map(row => this.mapToTable(row))
    }

    async update(table: Table): Promise<void> {
        await this.db.run(
            `UPDATE restaurant_tables
             SET number = ?, description = ?, capacity = ?, status = ?, party_size = ?,
                 occupied_by_client_id = ?, occupied_at = ?, updated_at = ?
             WHERE id = ?`,
            [
                table.number, table.description, table.capacity, table.status, table.partySize,
                table.occupiedByClientId, table.occupiedAt, table.updatedAt, table.id
            ]
        )
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM restaurant_tables WHERE id = ?', [id])
    }

    private mapToTable(row: TableRow): Table {
        return { ...row, status: normalizeTableStatus(row.status) }
    }
}
