import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'

describe('Database migrations', () => {
    let db: Database

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', 'now', 'now']
        )
    })

    afterAll(async () => {
        await db.close()
    })

    const insertTable = (id: string, restaurantId: string, number: number) =>
        db.run(
            'INSERT INTO restaurant_tables (id, restaurant_id, number, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, restaurantId, number, 4, 'libre', 'now', 'now']
        )

    it('creates the restaurant_tables table with the expected columns', async () => {
        const columns = await db.all<{ name: string }>('PRAGMA table_info(restaurant_tables)')
        expect(columns.map(c => c.name)).toEqual([
            'id', 'restaurant_id', 'number', 'description', 'capacity', 'status',
            'party_size', 'occupied_by_client_id', 'occupied_at', 'created_at', 'updated_at'
        ])
    })

    it('rejects a duplicated number within the same restaurant', async () => {
        await insertTable('t1', 'r1', 1)
        await expect(insertTable('t2', 'r1', 1)).rejects.toThrow(/UNIQUE/)
    })

    it('rejects a table for a restaurant that does not exist', async () => {
        await expect(insertTable('t3', 'missing', 1)).rejects.toThrow(/FOREIGN KEY/)
    })
})
