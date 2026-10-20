import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TableService } from './table.service'
import { Table } from '../models/table.model'
import { environment } from '../../../../environments/environment'

const table: Table = {
  id: 't1',
  restaurantId: 'r1',
  number: 4,
  description: null,
  capacity: 4,
  status: 'libre',
  partySize: null,
  occupiedByClientId: null,
  occupiedAt: null,
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z'
}

describe('TableService', () => {
  let service: TableService
  let http: HttpTestingController
  const base = `${environment.apiUrl}/restaurants/r1/tables`

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    service = TestBed.inject(TableService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('getAll pide las mesas con include=activeOrders', () => {
    let result: Table[] | undefined
    service.getAll('r1').subscribe(t => (result = t))

    const req = http.expectOne(r => r.url === base)
    expect(req.request.method).toBe('GET')
    expect(req.request.params.get('include')).toBe('activeOrders')
    req.flush([table])

    expect(result).toEqual([table])
  })

  it('updateStatus hace PATCH del estado sin force por defecto', () => {
    let result: Table | undefined
    service.updateStatus('r1', 't1', 'ocupada').subscribe(t => (result = t))

    const req = http.expectOne(r => r.url === `${base}/t1/status`)
    expect(req.request.method).toBe('PATCH')
    expect(req.request.body).toEqual({ status: 'ocupada' })
    expect(req.request.params.has('force')).toBe(false)
    req.flush({ ...table, status: 'ocupada' })

    expect(result?.status).toBe('ocupada')
  })

  it('updateStatus envía force=true cuando se fuerza', () => {
    service.updateStatus('r1', 't1', 'libre', true).subscribe()

    const req = http.expectOne(r => r.url === `${base}/t1/status`)
    expect(req.request.params.get('force')).toBe('true')
    req.flush(table)
  })

  it('getOrders pide los pedidos de la ocupación actual de la mesa', () => {
    let result: unknown
    service.getOrders('r1', 't1').subscribe(o => (result = o))

    const req = http.expectOne(`${base}/t1/orders`)
    expect(req.request.method).toBe('GET')
    req.flush([])

    expect(result).toEqual([])
  })
})
