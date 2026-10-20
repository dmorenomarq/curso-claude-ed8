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
    RestaurantNotFoundError,
    TableNotAvailableError,
    ClientAlreadySeatedError,
    InvalidPartySizeError,
    NotTableOwnerError
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

describe('TableService status changes', () => {
    let tables: MockTableRepository
    let orders: MockOrderRepository
    let service: TableService

    beforeEach(async () => {
        ;({ tables, orders, service } = await buildService())
    })

    const occupied = (overrides: Partial<Table> = {}) => makeTable({
        status: 'ocupada', partySize: 3, occupiedByClientId: 'c1', occupiedAt: '2026-10-20T13:00:00.000Z', ...overrides
    })

    describe('updateStatus', () => {
        it('allows any transition between the three states', async () => {
            await tables.create(makeTable())

            expect((await service.updateStatus('r1', 't1', 'reservada')).status).toBe('reservada')
            expect((await service.updateStatus('r1', 't1', 'ocupada')).status).toBe('ocupada')
            expect((await service.updateStatus('r1', 't1', 'reservada')).status).toBe('reservada')
            expect((await service.updateStatus('r1', 't1', 'libre')).status).toBe('libre')
            expect((await tables.findById('t1'))?.status).toBe('libre')
        })

        it('is an idempotent no-op when the table already has that status', async () => {
            await tables.create(occupied())

            const table = await service.updateStatus('r1', 't1', 'ocupada')

            expect(table).toMatchObject({ status: 'ocupada', partySize: 3, occupiedByClientId: 'c1' })
            expect(table.updatedAt).toBe('2026-10-20T10:00:00.000Z')
        })

        it('to ocupada leaves partySize and client null and sets occupiedAt to now', async () => {
            await tables.create(makeTable())

            const table = await service.updateStatus('r1', 't1', 'ocupada')

            expect(table.partySize).toBeNull()
            expect(table.occupiedByClientId).toBeNull()
            expect(table.occupiedAt).not.toBeNull()
        })

        it('to libre clears the occupation', async () => {
            await tables.create(occupied())

            const table = await service.updateStatus('r1', 't1', 'libre')

            expect(table).toMatchObject({ status: 'libre', partySize: null, occupiedByClientId: null, occupiedAt: null })
        })

        it('to libre fails with TableInUseError when there are undelivered lines of the current occupation', async () => {
            await tables.create(occupied())
            await orders.create(makeOrder('o1', 't1', ['pendiente', 'entregado', 'listo'], new Date('2026-10-20T13:30:00.000Z')))
            await orders.create(makeOrder('old', 't1', ['pendiente'], new Date('2026-10-20T09:00:00.000Z')))

            const error = await service.updateStatus('r1', 't1', 'libre').catch(e => e)

            expect(error).toBeInstanceOf(TableInUseError)
            expect(error.details).toEqual({ reason: 'pedidos_pendientes', pendingItems: 2 })
            expect((await tables.findById('t1'))?.status).toBe('ocupada')
        })

        it('to libre with force=true skips the pending lines check', async () => {
            await tables.create(occupied())
            await orders.create(makeOrder('o1', 't1', ['pendiente'], new Date('2026-10-20T13:30:00.000Z')))

            const table = await service.updateStatus('r1', 't1', 'libre', true)

            expect(table.status).toBe('libre')
        })

        it('to reservada never fails because of pending lines and clears the occupation', async () => {
            await tables.create(occupied())
            await orders.create(makeOrder('o1', 't1', ['pendiente'], new Date('2026-10-20T13:30:00.000Z')))

            const table = await service.updateStatus('r1', 't1', 'reservada')

            expect(table).toMatchObject({ status: 'reservada', partySize: null, occupiedByClientId: null, occupiedAt: null })
        })

        it('rejects an invalid status', async () => {
            await tables.create(makeTable())

            await expect(service.updateStatus('r1', 't1', 'cerrada' as any)).rejects.toThrow(InvalidTableError)
        })

        it('throws TableNotFoundError for an unknown table or another restaurant', async () => {
            await tables.create(makeTable({ restaurantId: 'r2' }))

            await expect(service.updateStatus('r1', 't1', 'libre')).rejects.toThrow(TableNotFoundError)
            await expect(service.updateStatus('r1', 'nope', 'libre')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('update with status', () => {
        it('keeps the current status when it is omitted', async () => {
            await tables.create(occupied())

            const table = await service.update('r1', 't1', { number: 1, capacity: 6 })

            expect(table).toMatchObject({ status: 'ocupada', partySize: 3, capacity: 6 })
        })

        it('applies the same rules as PATCH status when it changes to libre', async () => {
            await tables.create(occupied())
            await orders.create(makeOrder('o1', 't1', ['pendiente'], new Date('2026-10-20T13:30:00.000Z')))

            await expect(service.update('r1', 't1', { number: 1, capacity: 6, status: 'libre' }))
                .rejects.toThrow(TableInUseError)
            expect(await tables.findById('t1')).toMatchObject({ status: 'ocupada', capacity: 4 })
        })

        it('changes the status and the fields together', async () => {
            await tables.create(makeTable())

            const table = await service.update('r1', 't1', { number: 2, capacity: 6, status: 'reservada' })

            expect(table).toMatchObject({ number: 2, capacity: 6, status: 'reservada' })
        })
    })
})

describe('TableService occupancy', () => {
    let tables: MockTableRepository
    let orders: MockOrderRepository
    let service: TableService

    const client = { id: 'c1', role: 'cliente' }
    const waiter = { id: 'w1', role: 'camarero' }

    beforeEach(async () => {
        ;({ tables, orders, service } = await buildService())
    })

    describe('listAvailable', () => {
        it('returns free tables that fit the party ordered by capacity and number', async () => {
            await tables.create(makeTable({ id: 'a', number: 1, capacity: 8 }))
            await tables.create(makeTable({ id: 'b', number: 2, capacity: 4 }))
            await tables.create(makeTable({ id: 'c', number: 3, capacity: 4, status: 'reservada' }))
            await tables.create(makeTable({ id: 'd', number: 4, capacity: 2 }))

            expect((await service.listAvailable('r1', 3)).map(t => t.id)).toEqual(['b', 'a'])
        })

        it('returns an empty list when nothing fits', async () => {
            expect(await service.listAvailable('r1', 3)).toEqual([])
        })

        it.each([0, -2, 1.5, NaN, undefined, '3'])('rejects partySize %s', async partySize => {
            await expect(service.listAvailable('r1', partySize as any)).rejects.toThrow(InvalidPartySizeError)
        })
    })

    describe('getMine', () => {
        it('returns the table occupied by the client', async () => {
            await tables.create(makeTable())
            await service.occupy('r1', 't1', 2, client)

            expect((await service.getMine('r1', 'c1')).id).toBe('t1')
        })

        it('throws TableNotFoundError when the client has none', async () => {
            await expect(service.getMine('r1', 'c1')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('occupy', () => {
        beforeEach(async () => {
            await tables.create(makeTable({ id: 't1', number: 1, capacity: 4 }))
            await tables.create(makeTable({ id: 't2', number: 2, capacity: 4 }))
        })

        it('occupies a free table for a client', async () => {
            const table = await service.occupy('r1', 't1', 3, client)

            expect(table).toMatchObject({ status: 'ocupada', partySize: 3, occupiedByClientId: 'c1' })
            expect(table.occupiedAt).not.toBeNull()
        })

        it('leaves occupiedByClientId null when the staff occupies it', async () => {
            const table = await service.occupy('r1', 't1', 2, waiter)

            expect(table).toMatchObject({ status: 'ocupada', occupiedByClientId: null })
        })

        it('is idempotent for the same client and the same table', async () => {
            const first = await service.occupy('r1', 't1', 3, client)
            const second = await service.occupy('r1', 't1', 3, client)

            expect(second).toEqual(first)
        })

        it('fails with ClientAlreadySeatedError when the client has another table', async () => {
            await service.occupy('r1', 't1', 2, client)

            const error = await service.occupy('r1', 't2', 2, client).catch(e => e)

            expect(error).toBeInstanceOf(ClientAlreadySeatedError)
            expect(error.details).toEqual({ tableId: 't1' })
            expect((await tables.findById('t2'))?.status).toBe('libre')
        })

        it('fails with TableNotAvailableError when someone else took the table', async () => {
            await service.occupy('r1', 't1', 2, { id: 'c2', role: 'cliente' })

            await expect(service.occupy('r1', 't1', 2, client)).rejects.toThrow(TableNotAvailableError)
        })

        it('fails with TableNotAvailableError when the table is reserved', async () => {
            await tables.update(makeTable({ id: 't1', status: 'reservada' }))

            await expect(service.occupy('r1', 't1', 2, client)).rejects.toThrow(TableNotAvailableError)
        })

        it('only one of two simultaneous occupy calls succeeds', async () => {
            const results = await Promise.allSettled([
                service.occupy('r1', 't1', 2, { id: 'c2', role: 'cliente' }),
                service.occupy('r1', 't1', 2, { id: 'c3', role: 'cliente' })
            ])

            expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
            const rejected = results.find(r => r.status === 'rejected') as PromiseRejectedResult
            expect(rejected.reason).toBeInstanceOf(TableNotAvailableError)
        })

        it('fails with InvalidPartySizeError when the party exceeds the capacity', async () => {
            const error = await service.occupy('r1', 't1', 5, client).catch(e => e)

            expect(error).toBeInstanceOf(InvalidPartySizeError)
            expect(error.message).toBe('La mesa tiene capacidad para 4 personas')
        })

        it.each([0, -1, 1.5, undefined])('fails with InvalidPartySizeError for partySize %s', async partySize => {
            await expect(service.occupy('r1', 't1', partySize as any, client)).rejects.toThrow(InvalidPartySizeError)
        })

        it('throws TableNotFoundError for an unknown table or another restaurant', async () => {
            await tables.create(makeTable({ id: 'x', restaurantId: 'r2', number: 1 }))

            await expect(service.occupy('r1', 'nope', 2, client)).rejects.toThrow(TableNotFoundError)
            await expect(service.occupy('r1', 'x', 2, client)).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('release', () => {
        beforeEach(async () => {
            await tables.create(makeTable())
            await service.occupy('r1', 't1', 2, client)
        })

        it('lets the occupying client release a table without lines', async () => {
            const table = await service.release('r1', 't1', client)

            expect(table).toMatchObject({ status: 'libre', partySize: null, occupiedByClientId: null, occupiedAt: null })
            expect((await tables.findById('t1'))?.status).toBe('libre')
        })

        it('lets the staff release it', async () => {
            expect((await service.release('r1', 't1', waiter)).status).toBe('libre')
        })

        it('forbids a client that is not the occupant', async () => {
            await expect(service.release('r1', 't1', { id: 'c2', role: 'cliente' })).rejects.toThrow(NotTableOwnerError)
            expect((await tables.findById('t1'))?.status).toBe('ocupada')
        })

        it('fails with TableInUseError when there are undelivered lines', async () => {
            await orders.create(makeOrder('o1', 't1', ['pendiente', 'listo'], new Date(Date.now() + 1000)))

            const error = await service.release('r1', 't1', waiter).catch(e => e)

            expect(error).toBeInstanceOf(TableInUseError)
            expect(error.details).toEqual({ reason: 'pedidos_pendientes', pendingItems: 2 })
        })

        it('a client can never force the release', async () => {
            await orders.create(makeOrder('o1', 't1', ['pendiente'], new Date(Date.now() + 1000)))

            await expect(service.release('r1', 't1', client, true)).rejects.toThrow(TableInUseError)
        })

        it('the staff can force the release', async () => {
            await orders.create(makeOrder('o1', 't1', ['pendiente'], new Date(Date.now() + 1000)))

            expect((await service.release('r1', 't1', waiter, true)).status).toBe('libre')
        })

        it('releasing a free table is a no-op for the staff', async () => {
            await service.release('r1', 't1', waiter)

            expect((await service.release('r1', 't1', waiter)).status).toBe('libre')
        })

        it('forbids a client releasing a free table', async () => {
            await service.release('r1', 't1', client)

            await expect(service.release('r1', 't1', client)).rejects.toThrow(NotTableOwnerError)
        })
    })
})
