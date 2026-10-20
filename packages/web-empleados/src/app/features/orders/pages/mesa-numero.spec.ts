import { Type, provideZonelessChangeDetection, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { AuthStore } from '@resttek/web-shared'
import { OrderStore } from '../store/order.store'
import { Order } from '../models/order.model'
import { CocinaComponent } from './cocina/cocina.component'
import { BarraComponent } from './barra/barra.component'
import { SalonComponent } from './salon/salon.component'

const pedido = (tableNumber: number | null): Order => ({
  id: 'abcdef123456',
  restaurantId: 'r1',
  tableId: tableNumber === null ? null : 'uuid-de-mesa',
  tableNumber,
  clientId: null,
  createdAt: '2026-10-20T10:05:00.000Z',
  items: [
    { id: 'i1', dishId: 'd1', quantity: 1, notes: null, status: 'pendiente', dishName: 'Tortilla', dishCategory: 'Comida' },
    { id: 'i2', dishId: 'd2', quantity: 1, notes: null, status: 'pendiente', dishName: 'Caña', dishCategory: 'Bebida' },
    { id: 'i3', dishId: 'd3', quantity: 1, notes: null, status: 'listo', dishName: 'Flan', dishCategory: 'Postre' }
  ]
})

describe('«Mesa N» en los pedidos de cocina, barra y salón', () => {
  const orders = signal<Order[]>([])
  const orderStore = { orders, loading: signal(false), error: signal<string | null>(null), startPolling: vi.fn(), stopPolling: vi.fn() }

  function render(component: Type<unknown>): HTMLElement {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: OrderStore, useValue: orderStore },
        { provide: AuthStore, useValue: { user: () => ({ restaurantId: 'r1' }) } }
      ]
    })
    const fixture = TestBed.createComponent(component)
    fixture.detectChanges()
    return fixture.nativeElement
  }

  const casos: [string, Type<unknown>][] = [
    ['cocina', CocinaComponent],
    ['barra', BarraComponent],
    ['salón', SalonComponent]
  ]

  it.each(casos)('%s muestra el número de mesa y no su id', (_nombre, component) => {
    orders.set([pedido(4)])
    const el = render(component)

    const badge = el.querySelector('.table-badge')
    expect(badge?.textContent?.trim()).toBe('Mesa 4')
    expect(el.textContent).not.toContain('uuid-de-mesa')
  })

  it.each(casos)('%s no muestra etiqueta si el pedido no tiene mesa', (_nombre, component) => {
    orders.set([pedido(null)])
    const el = render(component)

    expect(el.querySelector('.table-badge')).toBeNull()
  })
})
