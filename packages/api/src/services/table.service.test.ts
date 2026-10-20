import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import type { Table } from '@models/table.model.js'
import type { Order, OrderStatusType } from '@models/order.model.js'
import {
    InvalidTableError,
    TableNotFoundError,
    DuplicatedTableNumberError,
    TableInUseError,
    RestaurantNotFoundError
} from '@errors/DomainErrors.js'

const makeTable = (overrides: Partial<Table> = {}): Table => ({
    id: 't1',
    restaurantId: 'r1',
    number: 1,
    description: null,
    capacity: 4,
    status: 'libre',
    partySize: null,
    occupiedByClientId: null,
    occupiedAt: null,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    ...overrides
})

const makeOrder = (id: string, tableId: string, statuses: OrderStatusType[], createdAt = new Date()): Order => ({
    id,
    restaurantId: 'r1',
    tableId,
    clientId: 'c1',
    createdAt,
    items: statuses.map((status, i) => ({ id: `${id}-i${i}`, dishId: 'd1', quantity: 1, notes: null, status }))
})

async function buildService() {
    const tables = new MockTableRepository()
    const orders = new MockOrderRepository()
    const restaurants = new MockRestaurantRepository()
    await restaurants.save({
        id: 'r1', name: 'La Trattoria', address: 'Calle Mayor 10', email: 'info@trattoria.com',
        phone: '+34 612345678', ownerFirstName: 'Carlos', ownerLastName: 'García', logoUrl: null,
        createdAt: 'now', updatedAt: 'now'
    })
    return { tables, orders, restaurants, service: new TableService(tables, orders, restaurants) }
}

describe('TableService CRUD', () => {
    let tables: MockTableRepository
    let orders: MockOrderRepository
    let service: TableService

    beforeEach(async () => {
        ;({ tables, orders, service } = await buildService())
    })

    describe('create', () => {
        it('creates a free table with generated id and timestamps', async () => {
            const table = await service.create('r1', { number: 3, capacity: 6, description: 'Salón principal' })

            expect(table).toMatchObject({
                restaurantId: 'r1', number: 3, capacity: 6, description: 'Salón principal',
                status: 'libre', partySize: null, occupiedByClientId: null, occupiedAt: null
            })
            expect(table.id).toBeDefined()
            expect(table.createdAt).toBe(table.updatedAt)
            expect(await tables.findById(table.id)).not.toBeNull()
        })

        it('stores a null description when omitted', async () => {
            const table = await service.create('r1', { number: 1, capacity: 2 })

            expect(table.description).toBeNull()
        })

        it('accepts an explicit initial status', async () => {
            const table = await service.create('r1', { number: 1, capacity: 2, status: 'reservada' })

            expect(table.status).toBe('reservada')
        })

        it.each([0, -1, 1.5, '2', undefined])('rejects number %s', async number => {
            await expect(service.create('r1', { number: number as any, capacity: 4 })).rejects.toThrow(InvalidTableError)
        })

        it.each([0, -1, 2.5, '4', undefined])('rejects capacity %s', async capacity => {
            await expect(service.create('r1', { number: 1, capacity: capacity as any })).rejects.toThrow(InvalidTableError)
        })

        it('rejects an invalid status', async () => {
            await expect(service.create('r1', { number: 1, capacity: 4, status: 'cerrada' as any }))
                .rejects.toThrow(InvalidTableError)
        })

        it('rejects a description that is not a string', async () => {
            await expect(service.create('r1', { number: 1, capacity: 4, description: 5 as any }))
                .rejects.toThrow(InvalidTableError)
        })

        it('rejects a duplicated number in the same restaurant', async () => {
            await service.create('r1', { number: 1, capacity: 4 })

            await expect(service.create('r1', { number: 1, capacity: 2 })).rejects.toThrow(DuplicatedTableNumberError)
        })

        it('rejects a restaurant that does not exist', async () => {
            await expect(service.create('nope', { number: 1, capacity: 4 })).rejects.toThrow(RestaurantNotFoundError)
        })
    })

    describe('getAll', () => {
        it('returns the tables of the restaurant ordered by number', async () => {
            await tables.create(makeTable({ id: 'b', number: 2 }))
            await tables.create(makeTable({ id: 'a', number: 1 }))
            await tables.create(makeTable({ id: 'c', number: 1, restaurantId: 'r2' }))

            const result = await service.getAll('r1')

            expect(result.map(t => t.id)).toEqual(['a', 'b'])
        })

        it('applies status and minCapacity filters', async () => {
            await tables.create(makeTable({ id: 'a', number: 1, capacity: 2 }))
            await tables.create(makeTable({ id: 'b', number: 2, capacity: 6, status: 'reservada' }))

            expect((await service.getAll('r1', { status: 'reservada' })).map(t => t.id)).toEqual(['b'])
            expect((await service.getAll('r1', { minCapacity: 4 })).map(t => t.id)).toEqual(['b'])
        })
    })

    describe('getById', () => {
        it('returns the table', async () => {
            await tables.create(makeTable())

            expect((await service.getById('r1', 't1')).id).toBe('t1')
        })

        it('throws TableNotFoundError when it does not exist', async () => {
            await expect(service.getById('r1', 'nope')).rejects.toThrow(TableNotFoundError)
        })

        it('throws TableNotFoundError when it belongs to another restaurant', async () => {
            await tables.create(makeTable({ restaurantId: 'r2' }))

            await expect(service.getById('r1', 't1')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('update', () => {
        beforeEach(async () => {
            await tables.create(makeTable({ id: 't1', number: 1 }))
            await tables.create(makeTable({ id: 't2', number: 2 }))
        })

        it('replaces number, capacity and description and refreshes updatedAt', async () => {
            const table = await service.update('r1', 't1', { number: 5, capacity: 8, description: 'Barra' })

            expect(table).toMatchObject({ number: 5, capacity: 8, description: 'Barra', status: 'libre' })
            expect(table.updatedAt).not.toBe('2026-10-20T10:00:00.000Z')
            expect(table.createdAt).toBe('2026-10-20T10:00:00.000Z')
            expect((await tables.findById('t1'))?.number).toBe(5)
        })

        it('allows keeping its own number', async () => {
            const table = await service.update('r1', 't1', { number: 1, capacity: 8 })

            expect(table.capacity).toBe(8)
        })

        it('clears the description when omitted (full replacement)', async () => {
            await tables.update(makeTable({ id: 't1', description: 'Antigua' }))

            expect((await service.update('r1', 't1', { number: 1, capacity: 4 })).description).toBeNull()
        })

        it('rejects a number used by another table', async () => {
            await expect(service.update('r1', 't1', { number: 2, capacity: 4 })).rejects.toThrow(DuplicatedTableNumberError)
        })

        it('rejects invalid data', async () => {
            await expect(service.update('r1', 't1', { number: 1, capacity: 0 })).rejects.toThrow(InvalidTableError)
        })

        it('throws TableNotFoundError for an unknown table', async () => {
            await expect(service.update('r1', 'nope', { number: 1, capacity: 4 })).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('delete', () => {
        it('deletes a free table without pending lines', async () => {
            await tables.create(makeTable())

            await service.delete('r1', 't1')

            expect(await tables.findById('t1')).toBeNull()
        })

        it.each(['ocupada', 'reservada'] as const)('rejects deleting a %s table', async status => {
            await tables.create(makeTable({ status }))

            const error = await service.delete('r1', 't1').catch(e => e)

            expect(error).toBeInstanceOf(TableInUseError)
            expect(error.details.reason).toBe(status)
            expect(await tables.findById('t1')).not.toBeNull()
        })

        it('rejects deleting a free table that still has undelivered lines', async () => {
            await tables.create(makeTable())
            await orders.create(makeOrder('o1', 't1', ['entregado', 'preparando', 'pendiente']))

            const error = await service.delete('r1', 't1').catch(e => e)

            expect(error).toBeInstanceOf(TableInUseError)
            expect(error.details).toEqual({ reason: 'pedidos_pendientes', pendingItems: 2 })
        })

        it('throws TableNotFoundError for an unknown table', async () => {
            await expect(service.delete('r1', 'nope')).rejects.toThrow(TableNotFoundError)
        })
    })
})
