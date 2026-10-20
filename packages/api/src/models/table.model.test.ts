import { describe, it, expect } from 'vitest'
import { InvalidTableError } from '@errors/DomainErrors.js'
import { normalizeTableStatus, validateTableNumber, validateTableCapacity } from './table.model.js'

describe('normalizeTableStatus', () => {
    it.each(['libre', 'ocupada', 'reservada'])('accepts %s', status => {
        expect(normalizeTableStatus(status)).toBe(status)
    })

    it('trims and lowercases the value', () => {
        expect(normalizeTableStatus('  OCUPADA ')).toBe('ocupada')
    })

    it.each(['cerrada', '', undefined, 3])('rejects %s', value => {
        expect(() => normalizeTableStatus(value as any)).toThrow(InvalidTableError)
    })
})

describe('validateTableNumber', () => {
    it('accepts integers >= 1', () => {
        expect(validateTableNumber(1)).toBe(1)
        expect(validateTableNumber(12)).toBe(12)
    })

    it.each([0, -1, 1.5, '2', null, undefined, NaN])('rejects %s', value => {
        expect(() => validateTableNumber(value as any)).toThrow(InvalidTableError)
    })
})

describe('validateTableCapacity', () => {
    it('accepts integers >= 1', () => {
        expect(validateTableCapacity(1)).toBe(1)
        expect(validateTableCapacity(8)).toBe(8)
    })

    it.each([0, -3, 2.5, '4', null, undefined])('rejects %s', value => {
        expect(() => validateTableCapacity(value as any)).toThrow(InvalidTableError)
    })
})
