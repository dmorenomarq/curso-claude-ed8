import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Database } from '@config/database.js'
import { SqliteOrderRepository } from './order.repository.js'
import type { Order, OrderStatusType } from '@models/order.model.js'

describe('SqliteOrderRepository (mesas)', () => {
    let db: Database
    let repo: SqliteOrderRepository

    const makeOrder = (id: string, tableId: string | null, createdAt: string, statuses: OrderStatusType[]): Order => ({
        id,
        restaurantId: 'r1',
        tableId,
        clientId: 'c1',
        createdAt: new Date(createdAt),
        items: statuses.map((status, i) => ({
            id: `${id}-i${i}`, dishId: 'd1', quantity: 1, notes: null, status
        }))
    })

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteOrderRepository(db)
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', 'now', 'now']
        )
        await db.run(
            'INSERT INTO dishes (id, name, price, category, available, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ['d1', 'Paella', 12, 'principal', 1, 'r1', 'now', 'now']
        )
    })

    beforeEach(async () => {
        await db.run('DELETE FROM order_items')
        await db.run('DELETE FROM orders')
    })

    afterAll(async () => {
        await db.close()
    })

    describe('countPendingItemsByTable', () => {
        it('counts the undelivered lines of the orders of that table', async () => {
            await repo.create(makeOrder('o1', 't1', '2026-10-20T13:10:00.000Z', ['pendiente', 'listo', 'entregado']))
            await repo.create(makeOrder('o2', 't1', '2026-10-20T13:20:00.000Z', ['preparando']))
            await repo.create(makeOrder('o3', 't2', '2026-10-20T13:20:00.000Z', ['pendiente']))

            expect(await repo.countPendingItemsByTable('t1', null)).toBe(3)
        })

        it('only counts orders created since the given date', async () => {
            await repo.create(makeOrder('old', 't1', '2026-10-20T11:00:00.000Z', ['pendiente']))
            await repo.create(makeOrder('new', 't1', '2026-10-20T13:10:00.000Z', ['pendiente', 'pendiente']))

            expect(await repo.countPendingItemsByTable('t1', '2026-10-20T13:00:00.000Z')).toBe(2)
        })

        it('returns 0 when everything is delivered or there are no orders', async () => {
            await repo.create(makeOrder('o1', 't1', '2026-10-20T13:10:00.000Z', ['entregado']))

            expect(await repo.countPendingItemsByTable('t1', null)).toBe(0)
            expect(await repo.countPendingItemsByTable('t9', null)).toBe(0)
        })
    })

    describe('findByTable', () => {
        it('returns the orders of the table with their lines, oldest first', async () => {
            await repo.create(makeOrder('o2', 't1', '2026-10-20T13:20:00.000Z', ['entregado']))
            await repo.create(makeOrder('o1', 't1', '2026-10-20T13:10:00.000Z', ['pendiente', 'listo']))
            await repo.create(makeOrder('o3', 't2', '2026-10-20T13:15:00.000Z', ['pendiente']))

            const found = await repo.findByTable('t1', null)

            expect(found.map(o => o.id)).toEqual(['o1', 'o2'])
            expect(found[0]?.items.map(i => i.status).sort()).toEqual(['listo', 'pendiente'])
            expect(found[0]?.items[0]).toMatchObject({ dishName: 'Paella', dishPrice: 12, dishCategory: 'principal' })
        })

        it('only returns orders created since the given date', async () => {
            await repo.create(makeOrder('old', 't1', '2026-10-20T11:00:00.000Z', ['entregado']))
            await repo.create(makeOrder('new', 't1', '2026-10-20T13:10:00.000Z', ['entregado']))

            const found = await repo.findByTable('t1', '2026-10-20T13:00:00.000Z')

            expect(found.map(o => o.id)).toEqual(['new'])
        })

        it('with onlyActive only returns orders with an undelivered line', async () => {
            await repo.create(makeOrder('done', 't1', '2026-10-20T13:10:00.000Z', ['entregado', 'entregado']))
            await repo.create(makeOrder('open', 't1', '2026-10-20T13:20:00.000Z', ['entregado', 'preparando']))

            const found = await repo.findByTable('t1', null, true)

            expect(found.map(o => o.id)).toEqual(['open'])
            expect(found[0]?.items).toHaveLength(2)
        })
    })
})
