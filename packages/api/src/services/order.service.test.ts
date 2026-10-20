import { describe, it, expect, beforeEach } from 'vitest'
import { OrderService } from './order.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import type { Order } from '@models/order.model.js'
import type { Table } from '@models/table.model.js'
import {
    OrderNotFoundError,
    InvalidOrderStatusError,
    TableNotFoundError,
    TableNotOccupiedError,
    TableNotOccupiedByClientError
} from '@errors/DomainErrors.js'

describe('OrderService.updateItemStatus', () => {
    let repo: MockOrderRepository
    let service: OrderService
    let testOrder: Order

    beforeEach(async () => {
        repo = new MockOrderRepository()
        service = new OrderService(repo, new MockTableRepository())

        testOrder = {
            id: 'order-1',
            restaurantId: 'rest-1',
            tableId: null,
            clientId: null,
            createdAt: new Date(),
            items: [
                { id: 'item-1', dishId: 'dish-1', quantity: 1, notes: null, status: 'pendiente' }
            ]
        }
        await repo.create(testOrder)
    })

    it('should update the status of an item successfully', async () => {
        await service.updateItemStatus('order-1', 'item-1', 'preparando')
        const updatedItem = testOrder.items[0]!
        expect(updatedItem.status).toBe('preparando')
    })

    it('should throw an error if the order does not exist', async () => {
        await expect(service.updateItemStatus('order-bad', 'item-1', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw an error if the item does not exist inside the order', async () => {
        await expect(service.updateItemStatus('order-1', 'item-bad', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw DomainError if status is invalid', async () => {
        await expect(service.updateItemStatus('order-1', 'item-1', 'invalid-status'))
            .rejects.toThrow(InvalidOrderStatusError)
    })
})

describe('OrderService.create with tableId', () => {
    let orders: MockOrderRepository
    let tables: MockTableRepository
    let service: OrderService

    const makeTable = (overrides: Partial<Table> = {}): Table => ({
        id: 't1',
        restaurantId: 'rest-1',
        number: 4,
        description: null,
        capacity: 4,
        status: 'ocupada',
        partySize: 2,
        occupiedByClientId: 'c1',
        occupiedAt: '2026-10-20T13:00:00.000Z',
        createdAt: '2026-10-20T10:00:00.000Z',
        updatedAt: '2026-10-20T13:00:00.000Z',
        ...overrides
    })

    const request = (overrides: Record<string, unknown> = {}) => ({
        restaurantId: 'rest-1',
        tableId: 't1',
        clientId: 'c1',
        userRole: 'cliente',
        items: [{ dishId: 'dish-1', quantity: 2, notes: null }],
        ...overrides
    })

    beforeEach(async () => {
        orders = new MockOrderRepository()
        tables = new MockTableRepository()
        service = new OrderService(orders, tables)
        await tables.create(makeTable())
    })

    it('creates the order for a client sitting at the table and sets tableNumber', async () => {
        const order = await service.create(request())

        expect(order).toMatchObject({ tableId: 't1', tableNumber: 4, clientId: 'c1' })
        expect(order.items).toHaveLength(2)
        expect(orders.orders).toHaveLength(1)
    })

    it('creates the order for the staff on an occupied table, whoever occupies it', async () => {
        const order = await service.create(request({ clientId: 'w1', userRole: 'camarero' }))

        expect(order.tableNumber).toBe(4)
    })

    it('still creates orders without a table, with tableNumber null', async () => {
        const order = await service.create(request({ tableId: null }))

        expect(order).toMatchObject({ tableId: null, tableNumber: null })
    })

    it('throws TableNotFoundError when the table does not exist', async () => {
        await expect(service.create(request({ tableId: 'nope' }))).rejects.toThrow(TableNotFoundError)
        expect(orders.orders).toHaveLength(0)
    })

    it('throws TableNotFoundError when the table belongs to another restaurant', async () => {
        await tables.update(makeTable({ restaurantId: 'rest-2' }))

        await expect(service.create(request())).rejects.toThrow(TableNotFoundError)
    })

    it.each(['libre', 'reservada'] as const)('throws TableNotOccupiedByClientError for a client when the table is %s', async status => {
        await tables.update(makeTable({ status, occupiedByClientId: null }))

        await expect(service.create(request())).rejects.toThrow(TableNotOccupiedByClientError)
        expect(orders.orders).toHaveLength(0)
    })

    it('throws TableNotOccupiedByClientError when another client occupies the table', async () => {
        await tables.update(makeTable({ occupiedByClientId: 'c2' }))

        await expect(service.create(request())).rejects.toThrow(TableNotOccupiedByClientError)
    })

    it('throws TableNotOccupiedError for the staff when the table is not occupied', async () => {
        await tables.update(makeTable({ status: 'libre', occupiedByClientId: null }))

        await expect(service.create(request({ clientId: 'w1', userRole: 'camarero' }))).rejects.toThrow(TableNotOccupiedError)
    })
})
