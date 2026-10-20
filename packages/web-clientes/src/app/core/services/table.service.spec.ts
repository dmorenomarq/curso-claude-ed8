import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { API_URL } from '@resttek/web-shared'
import { TableService } from './table.service'
import { Table } from '../models/table.model'

const table: Table = {
  id: 't1',
  restaurantId: 'r1',
  number: 3,
  description: null,
  capacity: 4,
  status: 'libre',
  partySize: null,
  occupiedByClientId: null,
  occupiedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
}

describe('TableService', () => {
  let service: TableService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/v1' }
      ]
    })
    service = TestBed.inject(TableService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('getAvailable pide las mesas libres para partySize', () => {
    let result: Table[] | undefined
    service.getAvailable('r1', 3).subscribe(t => (result = t))
    const req = http.expectOne('/api/v1/restaurants/r1/tables/available?partySize=3')
    expect(req.request.method).toBe('GET')
    req.flush([table])
    expect(result).toEqual([table])
  })

  it('getMine obtiene la mesa ocupada por el cliente', () => {
    let result: Table | undefined
    service.getMine('r1').subscribe(t => (result = t))
    const req = http.expectOne('/api/v1/restaurants/r1/tables/mine')
    expect(req.request.method).toBe('GET')
    req.flush(table)
    expect(result).toEqual(table)
  })

  it('occupy envía partySize por POST', () => {
    service.occupy('r1', 't1', 2).subscribe()
    const req = http.expectOne('/api/v1/restaurants/r1/tables/t1/occupy')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ partySize: 2 })
    req.flush({ ...table, status: 'ocupada' })
  })

  it('release libera la mesa por POST', () => {
    service.release('r1', 't1').subscribe()
    const req = http.expectOne('/api/v1/restaurants/r1/tables/t1/release')
    expect(req.request.method).toBe('POST')
    req.flush(table)
  })
})
