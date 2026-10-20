import { TestBed } from '@angular/core/testing'
import { ActivatedRouteSnapshot, Router, UrlTree, provideRouter } from '@angular/router'
import { HttpErrorResponse } from '@angular/common/http'
import { Observable, of, throwError } from 'rxjs'
import { cartTableGuard, tableGuard } from './table.guard'
import { TableService } from '../services/table.service'
import { CartStore } from '../store/cart.store'

describe('table guards', () => {
  let tableService: { getMine: ReturnType<typeof vi.fn> }
  let cartStore: CartStore
  let router: Router

  const route = (id: string) => ({ paramMap: new Map([['id', id]]) }) as unknown as ActivatedRouteSnapshot
  const run = (guard: typeof tableGuard, id = 'r1') =>
    TestBed.runInInjectionContext(() => guard(route(id), {} as never))

  beforeEach(() => {
    tableService = { getMine: vi.fn() }
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TableService, useValue: tableService }]
    })
    cartStore = TestBed.inject(CartStore)
    router = TestBed.inject(Router)
  })

  describe('tableGuard', () => {
    it('deja pasar y guarda el tableId si el cliente ya tiene mesa', async () => {
      tableService.getMine.mockReturnValue(of({ id: 't1' }))
      const result = await new Promise(r => (run(tableGuard) as Observable<unknown>).subscribe(r))
      expect(result).toBe(true)
      expect(tableService.getMine).toHaveBeenCalledWith('r1')
      expect(cartStore.tableId()).toBe('t1')
    })

    it('redirige a la elección de mesa y olvida el tableId si no tiene mesa (404)', async () => {
      cartStore.setTable('vieja')
      tableService.getMine.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })))
      const result = await new Promise<UrlTree>(r => (run(tableGuard) as Observable<UrlTree>).subscribe(r))
      expect(router.serializeUrl(result)).toBe('/restaurants/r1/mesas')
      expect(cartStore.tableId()).toBeNull()
    })

    it('redirige también ante cualquier otro error', async () => {
      tableService.getMine.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })))
      const result = await new Promise<UrlTree>(r => (run(tableGuard) as Observable<UrlTree>).subscribe(r))
      expect(router.serializeUrl(result)).toBe('/restaurants/r1/mesas')
    })
  })

  describe('cartTableGuard', () => {
    it('deja pasar al carrito con mesa', () => {
      cartStore.setTable('t1')
      expect(run(cartTableGuard)).toBe(true)
    })

    it('redirige a restaurantes si no hay mesa', () => {
      const result = run(cartTableGuard) as UrlTree
      expect(router.serializeUrl(result)).toBe('/restaurants')
    })
  })
})
