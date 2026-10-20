import type { Request, Response, NextFunction } from 'express'
import type { TableActor, TableService } from '@services/table.service.js'
import type { TableFilters } from '@repositories/table.repository.js'
import { normalizeTableStatus } from '@models/table.model.js'
import { InvalidTableError } from '@errors/DomainErrors.js'

const FORCE_ROLES = ['admin', 'manager']

export class TableController {
    constructor(private readonly tableService: TableService) {}

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.create(this.restaurantId(req), req.body ?? {})
            res.status(201).json(table)
        } catch (error) {
            next(error)
        }
    }

    getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const include = req.query.include
            if (include !== undefined && include !== 'activeOrders') {
                throw new InvalidTableError('El parámetro include solo admite el valor activeOrders')
            }
            const tables = await this.tableService.getAll(
                this.restaurantId(req),
                this.parseFilters(req),
                { includeActiveOrders: include === 'activeOrders' }
            )
            res.status(200).json(tables)
        } catch (error) {
            next(error)
        }
    }

    getAvailable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const partySize = req.query.partySize === undefined ? NaN : Number(req.query.partySize)
            const tables = await this.tableService.listAvailable(this.restaurantId(req), partySize)
            res.status(200).json(tables)
        } catch (error) {
            next(error)
        }
    }

    getMine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.getMine(this.restaurantId(req), this.actor(req).id)
            res.status(200).json(table)
        } catch (error) {
            next(error)
        }
    }

    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.getById(this.restaurantId(req), req.params.id as string)
            res.status(200).json(table)
        } catch (error) {
            next(error)
        }
    }

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.update(this.restaurantId(req), req.params.id as string, req.body ?? {})
            res.status(200).json(table)
        } catch (error) {
            next(error)
        }
    }

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.tableService.delete(this.restaurantId(req), req.params.id as string)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }

    updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const force = this.parseForce(req, res)
            if (force === null) return
            const table = await this.tableService.updateStatus(
                this.restaurantId(req),
                req.params.id as string,
                normalizeTableStatus(req.body?.status),
                force
            )
            res.status(200).json(table)
        } catch (error) {
            next(error)
        }
    }

    occupy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.occupy(
                this.restaurantId(req),
                req.params.id as string,
                req.body?.partySize,
                this.actor(req)
            )
            res.status(200).json(table)
        } catch (error) {
            next(error)
        }
    }

    release = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const force = this.parseForce(req, res)
            if (force === null) return
            const table = await this.tableService.release(
                this.restaurantId(req),
                req.params.id as string,
                this.actor(req),
                force
            )
            res.status(200).json(table)
        } catch (error) {
            next(error)
        }
    }

    listOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const orders = await this.tableService.listOrders(this.restaurantId(req), req.params.id as string)
            res.status(200).json(orders)
        } catch (error) {
            next(error)
        }
    }

    private restaurantId(req: Request): string {
        return req.params.restaurantId as string
    }

    private actor(req: Request): TableActor {
        const user = (req as any).user
        return { id: user?.id, role: user?.role }
    }

    /** Devuelve `force`, o null tras responder 403 si lo pide un rol que no puede forzar. */
    private parseForce(req: Request, res: Response): boolean | null {
        const force = req.query.force === 'true'
        if (force && !FORCE_ROLES.includes(this.actor(req).role)) {
            res.status(403).json({ error: 'Forbidden: Insufficient permissions' })
            return null
        }
        return force
    }

    private parseFilters(req: Request): TableFilters {
        const filters: TableFilters = {}
        const { status, minCapacity, limit, offset } = req.query

        if (status !== undefined) {
            filters.status = normalizeTableStatus(status as string)
        }
        if (minCapacity !== undefined) {
            filters.minCapacity = this.parseInteger(minCapacity, 'minCapacity', 1)
        }
        if (limit !== undefined) {
            const parsed = this.parseInteger(limit, 'limit', 1)
            if (parsed > 200) throw new InvalidTableError('limit no puede ser mayor que 200')
            filters.limit = parsed
        }
        if (offset !== undefined) {
            filters.offset = this.parseInteger(offset, 'offset', 0)
        }
        return filters
    }

    private parseInteger(value: unknown, name: string, min: number): number {
        const parsed = Number(value)
        if (typeof value !== 'string' || value.trim() === '' || !Number.isInteger(parsed) || parsed < min) {
            throw new InvalidTableError(`${name} debe ser un entero mayor o igual que ${min}`)
        }
        return parsed
    }
}
