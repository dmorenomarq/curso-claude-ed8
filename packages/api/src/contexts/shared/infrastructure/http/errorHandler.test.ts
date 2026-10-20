import { describe, it, expect, vi } from 'vitest'
import { errorHandler } from './errorHandler.js'
import {
    InvalidTableError,
    TableNotFoundError,
    DuplicatedTableNumberError,
    TableInUseError
} from '@errors/DomainErrors.js'

function run(error: unknown) {
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    errorHandler(error, {} as any, res, vi.fn())
    return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] }
}

describe('errorHandler (mesas)', () => {
    it('maps InvalidTableError to 400', () => {
        const { status, body } = run(new InvalidTableError('La capacidad debe ser un entero mayor o igual que 1'))
        expect(status).toBe(400)
        expect(body).toEqual({ error: 'InvalidTableError', message: 'La capacidad debe ser un entero mayor o igual que 1' })
    })

    it('maps TableNotFoundError to 404', () => {
        const { status, body } = run(new TableNotFoundError())
        expect(status).toBe(404)
        expect(body).toEqual({ error: 'TableNotFoundError', message: 'Mesa no encontrada' })
    })

    it('maps DuplicatedTableNumberError to 409', () => {
        const { status, body } = run(new DuplicatedTableNumberError(3))
        expect(status).toBe(409)
        expect(body.error).toBe('DuplicatedTableNumberError')
        expect(body.message).toBe('Ya existe una mesa con el número 3 en este restaurante')
    })

    it('maps TableInUseError to 409 with reason and pendingItems', () => {
        const { status, body } = run(new TableInUseError('pedidos_pendientes', 3))
        expect(status).toBe(409)
        expect(body).toEqual({
            error: 'TableInUseError',
            message: 'La mesa tiene 3 líneas de pedido sin entregar',
            reason: 'pedidos_pendientes',
            pendingItems: 3
        })
    })

    it.each([
        ['ocupada', 'No se puede continuar: la mesa está ocupada'],
        ['reservada', 'No se puede continuar: la mesa está reservada']
    ] as const)('TableInUseError with reason %s has a readable message', (reason, message) => {
        const { body } = run(new TableInUseError(reason, 0))
        expect(body).toMatchObject({ reason, pendingItems: 0, message })
    })
})
