import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router, provideRouter } from '@angular/router'
import { HttpErrorResponse } from '@angular/common/http'
import { of, throwError } from 'rxjs'
import { RestaurantMenuComponent } from './restaurant-menu.component'
import { DishService } from '../../core/services/dish.service'
import { RestaurantService } from '../../core/services/restaurant.service'
import { TableService } from '../../core/services/table.service'
import { CartStore } from '../../core/store/cart.store'

describe('RestaurantMenuComponent liberar mesa', () => {
  let tableService: { release: ReturnType<typeof vi.fn> }
  let router: Router
  let cartStore: CartStore

  function create() {
    const fixture = TestBed.createComponent(RestaurantMenuComponent)
    fixture.detectChanges()
    return fixture.componentInstance
  }

  beforeEach(() => {
    tableService = { release: vi.fn().mockReturnValue(of({ id: 't1' })) }
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: TableService, useValue: tableService },
        { provide: DishService, useValue: { getByRestaurant: () => of([]) } },
        { provide: RestaurantService, useValue: { getById: () => of({ id: 'r1', name: 'Rest' }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'r1']]) } } }
      ]
    })
    cartStore = TestBed.inject(CartStore)
    cartStore.setTable('t1')
    router = TestBed.inject(Router)
    vi.spyOn(router, 'navigate').mockResolvedValue(true)
  })

  it('libera la mesa, olvida el tableId, vacía el carrito y vuelve a restaurantes', () => {
    const c = create()
    c.releaseTable()
    expect(tableService.release).toHaveBeenCalledWith('r1', 't1')
    expect(cartStore.tableId()).toBeNull()
    expect(router.navigate).toHaveBeenCalledWith(['/restaurants'])
  })

  it('con TableInUseError muestra el mensaje y conserva la mesa', () => {
    tableService.release.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { error: 'TableInUseError', message: 'Hay pedidos sin entregar' }
    })))
    const c = create()
    c.releaseTable()
    expect(c.releaseError()).toBe('Hay pedidos sin entregar')
    expect(cartStore.tableId()).toBe('t1')
    expect(router.navigate).not.toHaveBeenCalled()
  })
})
