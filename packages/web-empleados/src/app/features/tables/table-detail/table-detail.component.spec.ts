import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, provideRouter } from '@angular/router'
import { provideZonelessChangeDetection, signal } from '@angular/core'
import { of, throwError } from 'rxjs'
import { AuthStore } from '@resttek/web-shared'
import { TableDetailComponent } from './table-detail.component'
import { TableService } from '../services/table.service'
import { TableStore } from '../store/table.store'
import { Table } from '../models/table.model'
import { Order } from '../../orders/models/order.model'

const mesa: Table = {
  id: 't1',
  restaurantId: 'r1',
  number: 4,
  description: 'Terraza',
  capacity: 6,
  status: 'ocupada',
  partySize: 3,
  occupiedByClientId: 'c1',
  occupiedAt: '2026-10-20T10:00:00.000Z',
  createdAt: '2026-10-20T09:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z'
}

const pedido: Order = {
  id: 'abcdef123456',
  restaurantId: 'r1',
  tableId: 't1',
  tableNumber: 4,
  clientId: 'c1',
  createdAt: '2026-10-20T10:05:00.000Z',
  items: [
    { id: 'i1', dishId: 'd1', quantity: 2, notes: 'sin sal', status: 'preparando', dishName: 'Tortilla' },
    { id: 'i2', dishId: 'd2', quantity: 1, notes: null, status: 'entregado', dishName: 'Agua' }
  ]
}

describe('TableDetailComponent', () => {
  const tables = signal<Table[]>([mesa])
  const store = { tables, startPolling: vi.fn(), stopPolling: vi.fn() }
  const service = { getOrders: vi.fn() }

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: TableService, useValue: service },
        { provide: TableStore, useValue: store },
        { provide: AuthStore, useValue: { user: () => ({ restaurantId: 'r1' }), userRole: () => 'camarero' } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 't1' } } } }
      ]
    })
    const fixture = TestBed.createComponent(TableDetailComponent)
    fixture.detectChanges()
    return fixture
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    tables.set([mesa])
    service.getOrders.mockReturnValue(of([pedido]))
  })

  afterEach(() => vi.useRealTimers())

  it('muestra la mesa y los pedidos de la ocupación con el estado de cada línea', async () => {
    const fixture = setup()
    await vi.advanceTimersByTimeAsync(0)
    fixture.detectChanges()
    const el: HTMLElement = fixture.nativeElement

    expect(service.getOrders).toHaveBeenCalledWith('r1', 't1')
    expect(el.querySelector('h1')?.textContent).toContain('Mesa 4')
    expect(el.textContent).toContain('3 comensales')
    const items = el.querySelectorAll('.order-item')
    expect(items.length).toBe(2)
    expect(items[0].textContent).toContain('2x')
    expect(items[0].textContent).toContain('Tortilla')
    expect(items[0].querySelector('.badge')?.textContent).toContain('preparando')
    expect(items[1].querySelector('.badge')?.textContent).toContain('entregado')
  })

  it('refresca los pedidos cada 30 s y deja de hacerlo al destruirse', async () => {
    const fixture = setup()
    await vi.advanceTimersByTimeAsync(0)
    expect(service.getOrders).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(30000)
    expect(service.getOrders).toHaveBeenCalledTimes(2)

    fixture.destroy()
    await vi.advanceTimersByTimeAsync(60000)
    expect(service.getOrders).toHaveBeenCalledTimes(2)
  })

  it('avisa cuando la mesa aún no tiene pedidos', async () => {
    service.getOrders.mockReturnValue(of([]))
    const fixture = setup()
    await vi.advanceTimersByTimeAsync(0)
    fixture.detectChanges()

    expect(fixture.nativeElement.textContent).toContain('Esta mesa no tiene pedidos')
  })

  it('muestra un error si no se pueden cargar los pedidos', async () => {
    service.getOrders.mockReturnValue(throwError(() => new Error('boom')))
    const fixture = setup()
    await vi.advanceTimersByTimeAsync(0)
    fixture.detectChanges()

    expect(fixture.nativeElement.querySelector('.alert-error')?.textContent).toContain('No se pudieron cargar los pedidos')
  })
})
