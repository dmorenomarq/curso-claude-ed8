import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Database } from '@config/database.js'
import { SqliteTableRepository } from './table.repository.js'
import type { Table } from '@models/table.model.js'

const makeTable = (overrides: Partial<Table> = {}): Table => ({
    id: 't1',
    restaurantId: 'r1',
    number: 1,
    description: 'Terraza',
    capacity: 4,
    status: 'libre',
    partySize: null,
    occupiedByClientId: null,
    occupiedAt: null,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    ...overrides
})

describe('SqliteTableRepository (CRUD)', () => {
    let db: Database
    let repo: SqliteTableRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)
        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', 'now', 'now']
            )
        }
    })

    beforeEach(async () => {
        await db.run('DELETE FROM restaurant_tables')
    })

    afterAll(async () => {
        await db.close()
    })

    it('creates and finds a table by id', async () => {
        await repo.create(makeTable())

        expect(await repo.findById('t1')).toEqual(makeTable())
    })

    it('returns null when the table does not exist', async () => {
        expect(await repo.findById('nope')).toBeNull()
    })

    it('finds a table by restaurant and number', async () => {
        await repo.create(makeTable())

        expect((await repo.findByRestaurantAndNumber('r1', 1))?.id).toBe('t1')
        expect(await repo.findByRestaurantAndNumber('r2', 1)).toBeNull()
    })

    it('lists the tables of a restaurant ordered by number', async () => {
        await repo.create(makeTable({ id: 't3', number: 3 }))
        await repo.create(makeTable({ id: 't1', number: 1 }))
        await repo.create(makeTable({ id: 't2', number: 2, restaurantId: 'r2' }))

        const tables = await repo.findByRestaurant('r1')

        expect(tables.map(t => t.id)).toEqual(['t1', 't3'])
    })

    it('filters by status and minCapacity', async () => {
        await repo.create(makeTable({ id: 't1', number: 1, capacity: 2 }))
        await repo.create(makeTable({ id: 't2', number: 2, capacity: 6 }))
        await repo.create(makeTable({ id: 't3', number: 3, capacity: 8, status: 'reservada' }))

        expect((await repo.findByRestaurant('r1', { status: 'libre' })).map(t => t.id)).toEqual(['t1', 't2'])
        expect((await repo.findByRestaurant('r1', { minCapacity: 6 })).map(t => t.id)).toEqual(['t2', 't3'])
        expect((await repo.findByRestaurant('r1', { status: 'libre', minCapacity: 6 })).map(t => t.id)).toEqual(['t2'])
    })

    it('paginates with limit and offset', async () => {
        for (const n of [1, 2, 3, 4]) await repo.create(makeTable({ id: `t${n}`, number: n }))

        const page = await repo.findByRestaurant('r1', { limit: 2, offset: 1 })

        expect(page.map(t => t.number)).toEqual([2, 3])
    })

    it('updates a table', async () => {
        await repo.create(makeTable())

        await repo.update(makeTable({
            number: 5, capacity: 6, description: null, status: 'ocupada',
            partySize: 3, occupiedByClientId: 'c1', occupiedAt: '2026-10-20T13:00:00.000Z',
            updatedAt: '2026-10-20T13:00:00.000Z'
        }))

        const found = await repo.findById('t1')
        expect(found).toMatchObject({
            number: 5, capacity: 6, description: null, status: 'ocupada',
            partySize: 3, occupiedByClientId: 'c1', occupiedAt: '2026-10-20T13:00:00.000Z'
        })
        expect(found?.createdAt).toBe('2026-10-20T10:00:00.000Z')
    })

    it('deletes a table', async () => {
        await repo.create(makeTable())

        await repo.delete('t1')

        expect(await repo.findById('t1')).toBeNull()
    })
})
