import { TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { of, throwError } from 'rxjs'
import { TableStore } from './table.store'
import { TableService } from '../services/table.service'
import { Table } from '../models/table.model'

const mesa = (id: string, number: number, status: Table['status'] = 'libre'): Table => ({
  id,
  restaurantId: 'r1',
  number,
  description: null,
  capacity: 4,
  status,
  partySize: null,
  occupiedByClientId: null,
  occupiedAt: null,
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z'
})

describe('TableStore', () => {
  let store: TableStore
  const service = { getAll: vi.fn(), updateStatus: vi.fn(), getOrders: vi.fn() }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    TestBed.configureTestingModule({ providers: [{ provide: TableService, useValue: service }] })
    store = TestBed.inject(TableStore)
  })

  afterEach(() => {
    store.stopPolling()
    vi.useRealTimers()
  })

  it('loadTables carga las mesas y apaga loading', async () => {
    service.getAll.mockReturnValue(of([mesa('t1', 1), mesa('t2', 2)]))

    await store.loadTables('r1')

    expect(service.getAll).toHaveBeenCalledWith('r1')
    expect(store.tables().map(t => t.id)).toEqual(['t1', 't2'])
    expect(store.loading()).toBe(false)
    expect(store.error()).toBeNull()
  })

  it('loadTables guarda el error si la API falla', async () => {
    service.getAll.mockReturnValue(throwError(() => new Error('boom')))

    await store.loadTables('r1')

    expect(store.error()).toBe('No se pudieron cargar las mesas.')
    expect(store.loading()).toBe(false)
  })

  it('updateStatus sustituye la mesa en memoria sin recargar', async () => {
    service.getAll.mockReturnValue(of([mesa('t1', 1), mesa('t2', 2)]))
    await store.loadTables('r1')
    service.updateStatus.mockReturnValue(of(mesa('t2', 2, 'reservada')))

    const ok = await store.updateStatus('r1', 't2', 'reservada')

    expect(ok).toBe(true)
    expect(service.updateStatus).toHaveBeenCalledWith('r1', 't2', 'reservada', false)
    expect(store.tables().find(t => t.id === 't2')?.status).toBe('reservada')
    expect(service.getAll).toHaveBeenCalledTimes(1)
  })

  it('un 409 TableInUseError deja el conflicto pendiente y no cambia la mesa', async () => {
    service.getAll.mockReturnValue(of([mesa('t1', 1, 'ocupada')]))
    await store.loadTables('r1')
    const body = { error: 'TableInUseError', message: 'La mesa tiene 2 líneas sin entregar', reason: 'pedidos_pendientes', pendingItems: 2 }
    service.updateStatus.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: body })))

    const ok = await store.updateStatus('r1', 't1', 'libre')

    expect(ok).toBe(false)
    expect(store.conflict()).toEqual({ tableId: 't1', status: 'libre', message: body.message, pendingItems: 2 })
    expect(store.tables()[0].status).toBe('ocupada')
    expect(store.error()).toBeNull()
  })

  it('forceStatus reintenta con force=true y limpia el conflicto', async () => {
    service.getAll.mockReturnValue(of([mesa('t1', 1, 'ocupada')]))
    await store.loadTables('r1')
    const body = { error: 'TableInUseError', message: 'x', reason: 'pedidos_pendientes', pendingItems: 1 }
    service.updateStatus.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409, error: body })))
    await store.updateStatus('r1', 't1', 'libre')
    service.updateStatus.mockReturnValueOnce(of(mesa('t1', 1, 'libre')))

    const ok = await store.forceStatus('r1')

    expect(ok).toBe(true)
    expect(service.updateStatus).toHaveBeenLastCalledWith('r1', 't1', 'libre', true)
    expect(store.conflict()).toBeNull()
    expect(store.tables()[0].status).toBe('libre')
  })

  it('dismissConflict descarta el conflicto', async () => {
    service.getAll.mockReturnValue(of([mesa('t1', 1, 'ocupada')]))
    await store.loadTables('r1')
    const body = { error: 'TableInUseError', message: 'x', reason: 'pedidos_pendientes', pendingItems: 1 }
    service.updateStatus.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: body })))
    await store.updateStatus('r1', 't1', 'libre')

    store.dismissConflict()

    expect(store.conflict()).toBeNull()
  })

  it('otros errores muestran el message de la API', async () => {
    service.getAll.mockReturnValue(of([mesa('t1', 1)]))
    await store.loadTables('r1')
    service.updateStatus.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403, error: { error: 'Forbidden', message: 'Sin permiso' } }))
    )

    const ok = await store.updateStatus('r1', 't1', 'ocupada')

    expect(ok).toBe(false)
    expect(store.error()).toBe('Sin permiso')
  })

  it('startPolling carga al instante y cada 30 s hasta stopPolling', async () => {
    service.getAll.mockReturnValue(of([mesa('t1', 1)]))

    store.startPolling('r1')
    expect(service.getAll).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(30000)
    expect(service.getAll).toHaveBeenCalledTimes(2)

    store.stopPolling()
    await vi.advanceTimersByTimeAsync(60000)
    expect(service.getAll).toHaveBeenCalledTimes(2)
  })
})
