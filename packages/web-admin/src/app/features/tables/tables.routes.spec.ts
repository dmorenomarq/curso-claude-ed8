import { routes } from '../../app.routes'
import { TABLE_ROUTES } from './tables.routes'
import { TableListComponent } from './pages/table-list/table-list.component'
import { TableFormComponent } from './pages/table-form/table-form.component'
import type { Route } from '@angular/router'

describe('rutas de mesas', () => {
  const load = async (route: Route | undefined) => (route!.loadComponent as () => Promise<unknown>)()

  it('define listado, alta y edición', () => {
    expect(TABLE_ROUTES.map(r => r.path)).toEqual(['', 'new', ':id/edit'])
  })

  it('carga de forma lazy el listado y el formulario', async () => {
    expect(await load(TABLE_ROUTES[0])).toBe(TableListComponent)
    expect(await load(TABLE_ROUTES[1])).toBe(TableFormComponent)
    expect(await load(TABLE_ROUTES[2])).toBe(TableFormComponent)
  })

  it('cuelga de restaurants/:restaurantId/tables en las rutas de la app', async () => {
    const shell = routes.find(r => r.path === '')!
    const restaurant = shell.children!.find(r => r.path === 'restaurants/:restaurantId')!
    const tables = restaurant.children!.find(r => r.path === 'tables')
    expect(tables).toBeDefined()
    const children = await (tables!.loadChildren as () => Promise<unknown>)()
    expect(children).toBe(TABLE_ROUTES)
  })
})
