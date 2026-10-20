import { TestBed } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { TableService } from '../services/table.service'
import { TableStore } from './table.store'
import type { Table } from '../models/table.model'

const makeTable = (overrides: Partial<Table>): Table => ({
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

describe('TableStore', () => {
  let store: TableStore
  let service: {
    getAll: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    updateStatus: ReturnType<typeof vi.fn>
  }

  const t1 = makeTable({ id: 't1', number: 1, capacity: 2, status: 'libre' })
  const t2 = makeTable({ id: 't2', number: 2, capacity: 4, status: 'ocupada', partySize: 3 })
  const t3 = makeTable({ id: 't3', number: 3, capacity: 6, status: 'libre' })

  beforeEach(() => {
    service = {
      getAll: vi.fn().mockReturnValue(of([t1, t2, t3])),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateStatus: vi.fn()
    }
    TestBed.configureTestingModule({ providers: [{ provide: TableService, useValue: service }] })
    store = TestBed.inject(TableStore)
  })

  it('loadByRestaurant carga las mesas y apaga loading', async () => {
    await store.loadByRestaurant('r1')
    expect(service.getAll).toHaveBeenCalledWith('r1')
    expect(store.tables()).toEqual([t1, t2, t3])
    expect(store.loading()).toBe(false)
    expect(store.error()).toBeNull()
  })

  it('loadByRestaurant informa del error en español', async () => {
    service.getAll.mockReturnValue(throwError(() => new Error('boom')))
    await store.loadByRestaurant('r1')
    expect(store.error()).toBe('No se pudieron cargar las mesas.')
    expect(store.loading()).toBe(false)
  })

  it('filtra por estado', async () => {
    await store.loadByRestaurant('r1')
    store.setFilters({ status: 'libre' })
    expect(store.filteredTables()).toEqual([t1, t3])
  })

  it('filtra por capacidad mínima', async () => {
    await store.loadByRestaurant('r1')
    store.setFilters({ minCapacity: 4 })
    expect(store.filteredTables()).toEqual([t2, t3])
  })

  it('combina filtros y los limpia', async () => {
    await store.loadByRestaurant('r1')
    store.setFilters({ status: 'libre', minCapacity: 4 })
    expect(store.filteredTables()).toEqual([t3])
    store.clearFilters()
    expect(store.filteredTables()).toEqual([t1, t2, t3])
  })

  it('create añade la mesa manteniendo el orden por número', async () => {
    await store.loadByRestaurant('r1')
    const created = makeTable({ id: 't0', number: 0 })
    service.create.mockReturnValue(of(created))
    await store.create('r1', { number: 0, capacity: 4, description: null })
    expect(store.tables().map(t => t.id)).toEqual(['t0', 't1', 't2', 't3'])
  })

  it('update reemplaza la mesa', async () => {
    await store.loadByRestaurant('r1')
    const updated = { ...t1, capacity: 8 }
    service.update.mockReturnValue(of(updated))
    await store.update('r1', 't1', { number: 1, capacity: 8, description: null })
    expect(store.tables()[0]).toEqual(updated)
  })

  it('delete elimina la mesa de la lista', async () => {
    await store.loadByRestaurant('r1')
    service.delete.mockReturnValue(of(undefined))
    await store.delete('r1', 't2')
    expect(store.tables().map(t => t.id)).toEqual(['t1', 't3'])
  })

  it('updateStatus reemplaza la mesa y pasa force', async () => {
    await store.loadByRestaurant('r1')
    const updated = { ...t2, status: 'libre' as const, partySize: null }
    service.updateStatus.mockReturnValue(of(updated))
    await store.updateStatus('r1', 't2', 'libre', true)
    expect(service.updateStatus).toHaveBeenCalledWith('r1', 't2', 'libre', true)
    expect(store.tables()[1]).toEqual(updated)
  })

  it('propaga el error de las operaciones sin tocar la lista', async () => {
    await store.loadByRestaurant('r1')
    service.delete.mockReturnValue(throwError(() => ({ status: 409 })))
    await expect(store.delete('r1', 't2')).rejects.toEqual({ status: 409 })
    expect(store.tables()).toHaveLength(3)
  })
})
