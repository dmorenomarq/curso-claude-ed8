import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { provideZonelessChangeDetection, signal } from '@angular/core'
import { AuthStore } from '@resttek/web-shared'
import { TableBoardComponent } from './table-board.component'
import { TableStore, TableConflict } from '../store/table.store'
import { Table } from '../models/table.model'

const mesa = (id: string, number: number, status: Table['status'], capacity = 4): Table => ({
  id,
  restaurantId: 'r1',
  number,
  description: null,
  capacity,
  status,
  partySize: null,
  occupiedByClientId: null,
  occupiedAt: null,
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z'
})

describe('TableBoardComponent', () => {
  const tables = signal<Table[]>([])
  const conflict = signal<TableConflict | null>(null)
  const store = {
    tables,
    loading: signal(false),
    error: signal<string | null>(null),
    conflict,
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    updateStatus: vi.fn().mockResolvedValue(true),
    forceStatus: vi.fn().mockResolvedValue(true),
    dismissConflict: vi.fn()
  }

  function setup(role: string) {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: TableStore, useValue: store },
        { provide: AuthStore, useValue: { user: () => ({ restaurantId: 'r1' }), userRole: () => role } }
      ]
    })
    const fixture = TestBed.createComponent(TableBoardComponent)
    fixture.detectChanges()
    return fixture
  }

  beforeEach(() => {
    vi.clearAllMocks()
    tables.set([mesa('t2', 2, 'ocupada'), mesa('t1', 1, 'libre')])
    conflict.set(null)
  })

  it('arranca el polling del restaurante y lo para al destruirse', () => {
    const fixture = setup('camarero')
    expect(store.startPolling).toHaveBeenCalledWith('r1')

    fixture.destroy()
    expect(store.stopPolling).toHaveBeenCalled()
  })

  it('pinta una tarjeta por mesa ordenada por número con su estado', () => {
    const el: HTMLElement = setup('camarero').nativeElement

    const cards = el.querySelectorAll('.table-card')
    expect(cards.length).toBe(2)
    expect(cards[0].textContent).toContain('Mesa 1')
    expect(cards[0].querySelector('.badge')?.textContent).toContain('libre')
    expect(cards[1].textContent).toContain('Mesa 2')
    expect(cards[1].querySelector('.badge')?.textContent).toContain('ocupada')
  })

  it('cambiar el selector pide el cambio de estado a la store', () => {
    const el: HTMLElement = setup('camarero').nativeElement

    const select = el.querySelector('.table-card select') as HTMLSelectElement
    select.value = 'reservada'
    select.dispatchEvent(new Event('change'))

    expect(store.updateStatus).toHaveBeenCalledWith('r1', 't1', 'reservada')
  })

  it('el cocinero ve las mesas en solo lectura', () => {
    const el: HTMLElement = setup('cocinero').nativeElement

    expect(el.querySelector('.table-card select')).toBeNull()
  })

  it('ante un conflicto el manager puede forzar', () => {
    conflict.set({ tableId: 't2', status: 'libre', message: 'La mesa tiene 2 líneas sin entregar', pendingItems: 2 })
    const el: HTMLElement = setup('manager').nativeElement

    expect(el.querySelector('.alert-conflict')?.textContent).toContain('La mesa tiene 2 líneas sin entregar')
    ;(el.querySelector('.btn-force') as HTMLButtonElement).click()

    expect(store.forceStatus).toHaveBeenCalledWith('r1')
  })

  it('ante un conflicto el camarero no puede forzar pero sí descartar', () => {
    conflict.set({ tableId: 't2', status: 'libre', message: 'Faltan líneas', pendingItems: 1 })
    const el: HTMLElement = setup('camarero').nativeElement

    expect(el.querySelector('.btn-force')).toBeNull()
    ;(el.querySelector('.btn-dismiss') as HTMLButtonElement).click()

    expect(store.dismissConflict).toHaveBeenCalled()
  })
})
