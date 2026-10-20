import { TestBed } from '@angular/core/testing'
import { CartStore, Dish } from './cart.store'

const dish: Dish = {
  id: 'd1', name: 'Tortilla', description: null, price: 5, category: 'plato',
  available: true, restaurantId: 'r1', ingredients: []
}

describe('CartStore', () => {
  let store: CartStore

  beforeEach(() => {
    TestBed.configureTestingModule({})
    store = TestBed.inject(CartStore)
  })

  it('no tiene mesa por defecto', () => {
    expect(store.tableId()).toBeNull()
  })

  it('setTable guarda el tableId', () => {
    store.setTable('t1')
    expect(store.tableId()).toBe('t1')
  })

  it('clear vacía el carrito pero conserva la mesa ocupada', () => {
    store.setTable('t1')
    store.addItem(dish)
    store.clear()
    expect(store.items()).toEqual([])
    expect(store.tableId()).toBe('t1')
  })

  it('clearTable olvida la mesa', () => {
    store.setTable('t1')
    store.clearTable()
    expect(store.tableId()).toBeNull()
  })
})
