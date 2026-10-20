import type { OrderRepository } from '@repositories/order.repository.js'
import type { Order } from '@models/order.model.js'

export class MockOrderRepository implements OrderRepository {
    orders: Order[] = []

    async create(order: Order): Promise<void> {
        this.orders.push(order)
    }

    async findById(id: string): Promise<Order | null> {
        return this.orders.find(o => o.id === id) || null
    }

    async updateItemStatus(_orderId: string, _itemId: string, _status: string): Promise<void> {
        // En un repositorio real esto es un UPDATE SQL. El mock no necesita
        // persistir nada porque el service ya muta el item en memoria
        // antes de llamar a este método.
    }

    async findActiveByRestaurant(restaurantId: string): Promise<Order[]> {
        return this.orders.filter(o => o.restaurantId === restaurantId)
    }

    async findByClientId(clientId: string): Promise<Order[]> {
        return this.orders.filter(o => o.clientId === clientId)
    }

    async findByTable(tableId: string, since: string | null, onlyActive = false): Promise<Order[]> {
        return this.orders
            .filter(o => o.tableId === tableId && (since === null || o.createdAt.toISOString() >= since))
            .filter(o => !onlyActive || o.items.some(item => item.status !== 'entregado'))
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    }

    async countPendingItemsByTable(tableId: string, since: string | null): Promise<number> {
        return this.orders
            .filter(o => o.tableId === tableId && (since === null || o.createdAt.toISOString() >= since))
            .flatMap(o => o.items)
            .filter(item => item.status !== 'entregado')
            .length
    }
}
