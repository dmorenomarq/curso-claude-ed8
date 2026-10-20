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

describe('SqliteTableRepository (ocupación)', () => {
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

    it('findAvailable returns only free tables with enough capacity, ordered by capacity and number', async () => {
        await repo.create(makeTable({ id: 'a', number: 1, capacity: 8 }))
        await repo.create(makeTable({ id: 'b', number: 2, capacity: 4 }))
        await repo.create(makeTable({ id: 'c', number: 3, capacity: 4 }))
        await repo.create(makeTable({ id: 'd', number: 4, capacity: 6, status: 'ocupada' }))
        await repo.create(makeTable({ id: 'e', number: 5, capacity: 6, status: 'reservada' }))
        await repo.create(makeTable({ id: 'f', number: 6, capacity: 2 }))
        await repo.create(makeTable({ id: 'g', number: 1, capacity: 4, restaurantId: 'r2' }))

        const tables = await repo.findAvailable('r1', 3)

        expect(tables.map(t => t.id)).toEqual(['b', 'c', 'a'])
    })

    it('findAvailable returns an empty list when nothing fits', async () => {
        await repo.create(makeTable({ capacity: 2 }))

        expect(await repo.findAvailable('r1', 10)).toEqual([])
    })

    it('occupy marks a free table as occupied and returns true', async () => {
        await repo.create(makeTable())

        const occupied = await repo.occupy('t1', 3, 'c1', '2026-10-20T13:00:00.000Z')

        expect(occupied).toBe(true)
        expect(await repo.findById('t1')).toMatchObject({
            status: 'ocupada', partySize: 3, occupiedByClientId: 'c1', occupiedAt: '2026-10-20T13:00:00.000Z',
            updatedAt: '2026-10-20T13:00:00.000Z'
        })
    })

    it('occupy stores a null client when the staff occupies the table', async () => {
        await repo.create(makeTable())

        await repo.occupy('t1', 2, null, '2026-10-20T13:00:00.000Z')

        expect((await repo.findById('t1'))?.occupiedByClientId).toBeNull()
    })

    it.each(['ocupada', 'reservada'] as const)('occupy returns false when the table is %s', async status => {
        await repo.create(makeTable({ status }))

        expect(await repo.occupy('t1', 2, 'c1', '2026-10-20T13:00:00.000Z')).toBe(false)
        expect((await repo.findById('t1'))?.status).toBe(status)
    })

    it('occupy returns false when the party does not fit', async () => {
        await repo.create(makeTable({ capacity: 4 }))

        expect(await repo.occupy('t1', 5, 'c1', '2026-10-20T13:00:00.000Z')).toBe(false)
        expect((await repo.findById('t1'))?.status).toBe('libre')
    })

    it('only one of several simultaneous occupy calls succeeds', async () => {
        await repo.create(makeTable())

        const results = await Promise.all(
            ['c1', 'c2', 'c3'].map(c => repo.occupy('t1', 2, c, '2026-10-20T13:00:00.000Z'))
        )

        expect(results.filter(Boolean)).toHaveLength(1)
    })

    it('findByClient returns the table occupied by the client in that restaurant', async () => {
        await repo.create(makeTable({ id: 'a', number: 1 }))
        await repo.create(makeTable({ id: 'b', number: 2, restaurantId: 'r2' }))
        await repo.occupy('a', 2, 'c1', '2026-10-20T13:00:00.000Z')
        await repo.occupy('b', 2, 'c2', '2026-10-20T13:00:00.000Z')

        expect((await repo.findByClient('r1', 'c1'))?.id).toBe('a')
        expect(await repo.findByClient('r1', 'c2')).toBeNull()
        expect(await repo.findByClient('r2', 'c1')).toBeNull()
    })

    it('release leaves the table free and clears the occupation', async () => {
        await repo.create(makeTable())
        await repo.occupy('t1', 2, 'c1', '2026-10-20T13:00:00.000Z')

        await repo.release('t1', '2026-10-20T14:00:00.000Z')

        expect(await repo.findById('t1')).toMatchObject({
            status: 'libre', partySize: null, occupiedByClientId: null, occupiedAt: null,
            updatedAt: '2026-10-20T14:00:00.000Z'
        })
        expect(await repo.findByClient('r1', 'c1')).toBeNull()
    })
})
