import { randomUUID } from 'crypto'
import type { Table, TableStatusType } from '@models/table.model.js'
import { normalizeTableStatus, validateTableCapacity, validateTableNumber } from '@models/table.model.js'
import type { TableFilters, TableRepository } from '@repositories/table.repository.js'
import type { OrderRepository } from '@repositories/order.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import {
    DuplicatedTableNumberError,
    InvalidTableError,
    RestaurantNotFoundError,
    TableInUseError,
    TableNotFoundError
} from '@errors/DomainErrors.js'

export interface TableInputDTO {
    number: number
    capacity: number
    description?: string | null
    status?: TableStatusType
}

export class TableService {
    constructor(
        private readonly tableRepository: TableRepository,
        private readonly orderRepository: OrderRepository,
        private readonly restaurantRepository: RestaurantRepository
    ) {}

    async create(restaurantId: string, dto: TableInputDTO): Promise<Table> {
        const restaurant = await this.restaurantRepository.findById(restaurantId)
        if (!restaurant) {
            throw new RestaurantNotFoundError()
        }

        const number = validateTableNumber(dto.number)
        const capacity = validateTableCapacity(dto.capacity)
        const description = this.normalizeDescription(dto.description)
        const status = dto.status === undefined ? 'libre' : normalizeTableStatus(dto.status)
        await this.assertNumberAvailable(restaurantId, number)

        const now = new Date().toISOString()
        const table: Table = {
            id: randomUUID(),
            restaurantId,
            number,
            description,
            capacity,
            status,
            partySize: null,
            occupiedByClientId: null,
            occupiedAt: status === 'ocupada' ? now : null,
            createdAt: now,
            updatedAt: now
        }

        await this.tableRepository.create(table)
        return table
    }

    async getAll(restaurantId: string, filters: TableFilters = {}): Promise<Table[]> {
        return this.tableRepository.findByRestaurant(restaurantId, filters)
    }

    async getById(restaurantId: string, id: string): Promise<Table> {
        const table = await this.tableRepository.findById(id)
        if (!table || table.restaurantId !== restaurantId) {
            throw new TableNotFoundError()
        }
        return table
    }

    async update(restaurantId: string, id: string, dto: TableInputDTO, force = false): Promise<Table> {
        const existing = await this.getById(restaurantId, id)

        const number = validateTableNumber(dto.number)
        const capacity = validateTableCapacity(dto.capacity)
        const description = this.normalizeDescription(dto.description)
        if (number !== existing.number) {
            await this.assertNumberAvailable(restaurantId, number)
        }

        const withFields: Table = {
            ...existing,
            number,
            capacity,
            description,
            updatedAt: new Date().toISOString()
        }
        const updated = dto.status === undefined
            ? withFields
            : await this.withStatus(withFields, normalizeTableStatus(dto.status), force)

        await this.tableRepository.update(updated)
        return updated
    }

    async updateStatus(restaurantId: string, id: string, status: TableStatusType, force = false): Promise<Table> {
        const existing = await this.getById(restaurantId, id)
        const newStatus = normalizeTableStatus(status)
        if (newStatus === existing.status) {
            return existing
        }

        const updated = await this.withStatus(existing, newStatus, force)
        await this.tableRepository.update(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        const table = await this.getById(restaurantId, id)
        const pendingItems = await this.orderRepository.countPendingItemsByTable(table.id, null)

        if (table.status !== 'libre') {
            throw new TableInUseError(table.status, pendingItems)
        }
        if (pendingItems > 0) {
            throw new TableInUseError('pedidos_pendientes', pendingItems)
        }

        await this.tableRepository.delete(table.id)
    }

    /** Devuelve la mesa con el nuevo estado aplicado (sin persistir), o la misma si ya lo tenía. */
    private async withStatus(table: Table, status: TableStatusType, force: boolean): Promise<Table> {
        if (status === table.status) {
            return table
        }

        if (status === 'libre' && !force) {
            const pendingItems = await this.orderRepository.countPendingItemsByTable(table.id, table.occupiedAt)
            if (pendingItems > 0) {
                throw new TableInUseError('pedidos_pendientes', pendingItems)
            }
        }

        const now = new Date().toISOString()
        return {
            ...table,
            status,
            partySize: null,
            occupiedByClientId: null,
            occupiedAt: status === 'ocupada' ? now : null,
            updatedAt: now
        }
    }

    private async assertNumberAvailable(restaurantId: string, number: number): Promise<void> {
        const duplicated = await this.tableRepository.findByRestaurantAndNumber(restaurantId, number)
        if (duplicated) {
            throw new DuplicatedTableNumberError(number)
        }
    }

    private normalizeDescription(description: unknown): string | null {
        if (description === undefined || description === null) return null
        if (typeof description !== 'string') {
            throw new InvalidTableError('La descripción debe ser un texto')
        }
        const trimmed = description.trim()
        return trimmed === '' ? null : trimmed
    }
}
