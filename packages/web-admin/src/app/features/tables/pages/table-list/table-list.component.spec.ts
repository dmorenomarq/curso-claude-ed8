import { signal, importProvidersFrom } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { LucideAngularModule, Plus, Edit, Trash2, Utensils } from 'lucide-angular'
import { AuthStore } from '@resttek/web-shared'
import { TableStore } from '../../store/table.store'
import { TableListComponent } from './table-list.component'
import type { Table, TableFilters } from '../../models/table.model'

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

describe('TableListComponent', () => {
  const tables = signal<Table[]>([])
  const store = {
    filteredTables: tables,
    tables,
    loading: signal(false),
    error: signal<string | null>(null),
    filters: signal<TableFilters>({}),
    loadByRestaurant: vi.fn(),
    setFilters: vi.fn(),
    clearFilters: vi.fn(),
    delete: vi.fn(),
    updateStatus: vi.fn()
  }
  const role = signal<string | null>('admin')

  function render() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        importProvidersFrom(LucideAngularModule.pick({ Plus, Edit, Trash2, Utensils })),
        { provide: TableStore, useValue: store },
        { provide: AuthStore, useValue: { userRole: role } },
        { provide: ActivatedRoute, useValue: { parent: { paramMap: of({ get: () => 'r1' }) } } }
      ]
    })
    const fixture = TestBed.createComponent(TableListComponent)
    fixture.detectChanges()
    return fixture
  }

  beforeEach(() => {
    vi.clearAllMocks()
    tables.set([])
    store.loading.set(false)
    store.error.set(null)
    store.delete.mockResolvedValue(undefined)
    store.updateStatus.mockResolvedValue(undefined)
    role.set('admin')
    vi.restoreAllMocks()
  })

  it('carga las mesas del restaurante de la ruta', () => {
    render()
    expect(store.loadByRestaurant).toHaveBeenCalledWith('r1')
  })

  it('muestra un estado vacío sin mesas', () => {
    const el: HTMLElement = render().nativeElement
    expect(el.textContent).toContain('No hay mesas')
  })

  it('muestra el error del store', () => {
    store.error.set('No se pudieron cargar las mesas.')
    const el: HTMLElement = render().nativeElement
    expect(el.textContent).toContain('No se pudieron cargar las mesas.')
  })

  it('pinta una fila por mesa con número, capacidad y estado', () => {
    tables.set([
      makeTable({ id: 't1', number: 1, capacity: 2, status: 'libre' }),
      makeTable({ id: 't2', number: 2, capacity: 6, status: 'reservada' })
    ])
    const el: HTMLElement = render().nativeElement
    const rows = el.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('Libre')
    expect(rows[1].textContent).toContain('Reservada')
    expect(rows[1].textContent).toContain('6')
  })

  it('muestra la ocupación (comensales y hora) solo en mesas ocupadas', () => {
    tables.set([
      makeTable({ id: 't1', number: 1, status: 'libre' }),
      makeTable({ id: 't2', number: 2, status: 'ocupada', partySize: 3, occupiedAt: '2026-10-20T13:05:00.000Z' })
    ])
    const el: HTMLElement = render().nativeElement
    const cells = el.querySelectorAll('tbody tr td.occupancy')
    expect(cells[0].textContent?.trim()).toBe('—')
    expect(cells[1].textContent).toContain('3 personas')
    expect(cells[1].textContent).toMatch(/\d{2}:\d{2}/)
  })

  it('ocupación sin partySize (la ocupó el personal) no muestra comensales', () => {
    tables.set([makeTable({ status: 'ocupada', partySize: null, occupiedAt: '2026-10-20T13:05:00.000Z' })])
    const el: HTMLElement = render().nativeElement
    expect(el.querySelector('td.occupancy')?.textContent).not.toContain('personas')
  })

  it('cambiar el filtro de estado actualiza el store', () => {
    const fixture = render()
    fixture.componentInstance.onStatusFilter('ocupada')
    expect(store.setFilters).toHaveBeenCalledWith({ status: 'ocupada' })
    fixture.componentInstance.onStatusFilter('')
    expect(store.setFilters).toHaveBeenCalledWith({ status: null })
  })

  it('cambiar el filtro de capacidad actualiza el store', () => {
    const fixture = render()
    fixture.componentInstance.onCapacityFilter('4')
    expect(store.setFilters).toHaveBeenCalledWith({ minCapacity: 4 })
    fixture.componentInstance.onCapacityFilter('')
    expect(store.setFilters).toHaveBeenCalledWith({ minCapacity: null })
    fixture.componentInstance.onCapacityFilter('abc')
    expect(store.setFilters).toHaveBeenLastCalledWith({ minCapacity: null })
  })

  describe('borrado', () => {
    const table = makeTable({ id: 't2', number: 2 })

    it('no borra si el usuario cancela la confirmación', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      await render().componentInstance.onDelete(table)
      expect(store.delete).not.toHaveBeenCalled()
    })

    it('borra la mesa tras confirmar', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      await render().componentInstance.onDelete(table)
      expect(store.delete).toHaveBeenCalledWith('r1', 't2')
    })

    it('muestra el mensaje de TableInUseError al borrar una mesa en uso', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      store.delete.mockRejectedValue({
        status: 409,
        error: { error: 'TableInUseError', message: 'No se puede eliminar una mesa ocupada', reason: 'ocupada', pendingItems: 0 }
      })
      const cmp = render().componentInstance
      await cmp.onDelete(table)
      expect(cmp.actionError()).toBe('No se puede eliminar una mesa ocupada')
    })
  })

  describe('cambio de estado', () => {
    const table = makeTable({ id: 't2', number: 2, status: 'ocupada' })
    const inUse = {
      status: 409,
      error: { error: 'TableInUseError', message: 'La mesa tiene pedidos sin entregar', reason: 'pedidos_pendientes', pendingItems: 2 }
    }

    it('cambia el estado sin forzar', async () => {
      await render().componentInstance.onChangeStatus(table, 'reservada')
      expect(store.updateStatus).toHaveBeenCalledWith('r1', 't2', 'reservada')
    })

    it('no hace nada si el estado elegido es el actual', async () => {
      await render().componentInstance.onChangeStatus(table, 'ocupada')
      expect(store.updateStatus).not.toHaveBeenCalled()
    })

    it('ante TableInUseError pregunta y fuerza si el usuario confirma', async () => {
      store.updateStatus.mockRejectedValueOnce(inUse).mockResolvedValueOnce(undefined)
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
      const cmp = render().componentInstance
      await cmp.onChangeStatus(table, 'libre')
      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('La mesa tiene pedidos sin entregar'))
      expect(store.updateStatus).toHaveBeenLastCalledWith('r1', 't2', 'libre', true)
      expect(cmp.actionError()).toBeNull()
    })

    it('ante TableInUseError no fuerza si el usuario cancela', async () => {
      store.updateStatus.mockRejectedValue(inUse)
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      const cmp = render().componentInstance
      await cmp.onChangeStatus(table, 'libre')
      expect(store.updateStatus).toHaveBeenCalledTimes(1)
    })

    it('un usuario sin rol admin/manager no puede forzar: solo ve el mensaje', async () => {
      role.set('camarero')
      store.updateStatus.mockRejectedValue(inUse)
      const confirm = vi.spyOn(window, 'confirm')
      const cmp = render().componentInstance
      await cmp.onChangeStatus(table, 'libre')
      expect(confirm).not.toHaveBeenCalled()
      expect(cmp.actionError()).toBe('La mesa tiene pedidos sin entregar')
    })

    it('otros errores se muestran con su mensaje', async () => {
      store.updateStatus.mockRejectedValue({ status: 403, error: { error: 'Forbidden' } })
      const cmp = render().componentInstance
      await cmp.onChangeStatus(table, 'libre')
      expect(cmp.actionError()).toBe('No tienes permisos para realizar esta acción.')
    })
  })
})
