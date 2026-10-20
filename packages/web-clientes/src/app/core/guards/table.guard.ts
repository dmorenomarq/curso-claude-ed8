import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { catchError, map, of } from 'rxjs'
import { TableService } from '../services/table.service'
import { CartStore } from '../store/cart.store'

/** La carta solo es accesible si el cliente ocupa una mesa en ese restaurante. */
export const tableGuard: CanActivateFn = (route) => {
  const router = inject(Router)
  const cartStore = inject(CartStore)
  const restaurantId = route.paramMap.get('id') as string

  return inject(TableService).getMine(restaurantId).pipe(
    map(table => {
      cartStore.setTable(table.id)
      return true
    }),
    catchError(() => {
      cartStore.clearTable()
      return of(router.createUrlTree(['/restaurants', restaurantId, 'mesas']))
    })
  )
}

/** El carrito (y el envío del pedido) exige tener mesa. */
export const cartTableGuard: CanActivateFn = () => {
  if (inject(CartStore).tableId()) return true
  return inject(Router).createUrlTree(['/restaurants'])
}
