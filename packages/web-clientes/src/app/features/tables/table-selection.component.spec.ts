import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { TableSelectionComponent } from './table-selection.component'
import { TableService } from '../../core/services/table.service'
import { CartStore } from '../../core/store/cart.store'
import { Table } from '../../core/models/table.model'

const table = (id: string, number: number, capacity: number): Table => ({
  id, restaurantId: 'r1', number, description: null, capacity, status: 'libre',
  partySize: null, occupiedByClientId: null, occupiedAt: null,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
})

describe('TableSelectionComponent', () => {
  let tableService: { getAvailable: ReturnType<typeof vi.fn>; occupy: ReturnType<typeof vi.fn> }
  let router: Router

  function create() {
    const fixture = TestBed.createComponent(TableSelectionComponent)
    fixture.detectChanges()
    return fixture
  }

  beforeEach(() => {
    tableService = {
      getAvailable: vi.fn().mockReturnValue(of([table('t1', 1, 2), table('t2', 2, 4)])),
      occupy: vi.fn().mockReturnValue(of({ ...table('t2', 2, 4), status: 'ocupada' }))
    }
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: TableService, useValue: tableService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'r1']]) } } }
      ]
    })
    router = TestBed.inject(Router)
    vi.spyOn(router, 'navigate').mockResolvedValue(true)
  })

  it('no muestra mesas hasta indicar el número de personas', () => {
    const fixture = create()
    expect(tableService.getAvailable).not.toHaveBeenCalled()
    expect(fixture.nativeElement.querySelectorAll('.table-card').length).toBe(0)
  })

  it('al buscar pide las mesas con el número de personas y las pinta', () => {
    const fixture = create()
    const c = fixture.componentInstance
    c.setPartySize('3')
    c.search()
    fixture.detectChanges()
    expect(tableService.getAvailable).toHaveBeenCalledWith('r1', 3)
    expect(fixture.nativeElement.querySelectorAll('.table-card').length).toBe(2)
  })

  it('no busca si el número de personas no es un entero >= 1', () => {
    const c = create().componentInstance
    c.setPartySize('0')
    c.search()
    c.setPartySize('abc')
    c.search()
    expect(tableService.getAvailable).not.toHaveBeenCalled()
  })

  it('Continuar está deshabilitado hasta elegir una mesa', () => {
    const fixture = create()
    const c = fixture.componentInstance
    c.setPartySize('3')
    c.search()
    fixture.detectChanges()
    const btn = fixture.nativeElement.querySelector('.continue-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    c.select(c.tables()[1])
    fixture.detectChanges()
    expect(btn.disabled).toBe(false)
  })

  it('Continuar ocupa la mesa, guarda el tableId y va a la carta', () => {
    const fixture = create()
    const c = fixture.componentInstance
    c.setPartySize('3')
    c.search()
    c.select(c.tables()[1])
    c.continue()
    expect(tableService.occupy).toHaveBeenCalledWith('r1', 't2', 3)
    expect(TestBed.inject(CartStore).tableId()).toBe('t2')
    expect(router.navigate).toHaveBeenCalledWith(['/restaurants', 'r1'])
  })
})
