import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { environment } from '../../../../environments/environment'
import { TableService } from './table.service'
import type { CreateTableDto } from '../models/table.model'

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

  it('getAll lista las mesas sin filtros', () => {
    service.getAll('r1').subscribe()
    const req = http.expectOne(base)
    expect(req.request.method).toBe('GET')
    req.flush([])
  })

  it('getAll envía los filtros status y minCapacity', () => {
    service.getAll('r1', { status: 'libre', minCapacity: 4 }).subscribe()
    const req = http.expectOne(r => r.url === base)
    expect(req.request.params.get('status')).toBe('libre')
    expect(req.request.params.get('minCapacity')).toBe('4')
    req.flush([])
  })

  it('getAll omite los filtros vacíos', () => {
    service.getAll('r1', { status: null, minCapacity: null }).subscribe()
    const req = http.expectOne(r => r.url === base)
    expect(req.request.params.keys()).toEqual([])
    req.flush([])
  })

  it('getById pide la mesa por id', () => {
    service.getById('r1', 't1').subscribe()
    const req = http.expectOne(`${base}/t1`)
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('create hace POST con el dto', () => {
    const dto: CreateTableDto = { number: 3, capacity: 6, description: null }
    service.create('r1', dto).subscribe()
    const req = http.expectOne(base)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual(dto)
    req.flush({})
  })

  it('update hace PUT con el dto', () => {
    const dto: CreateTableDto = { number: 3, capacity: 6, description: 'Terraza' }
    service.update('r1', 't1', dto).subscribe()
    const req = http.expectOne(`${base}/t1`)
    expect(req.request.method).toBe('PUT')
    expect(req.request.body).toEqual(dto)
    req.flush({})
  })

  it('delete hace DELETE', () => {
    service.delete('r1', 't1').subscribe()
    const req = http.expectOne(`${base}/t1`)
    expect(req.request.method).toBe('DELETE')
    req.flush(null, { status: 204, statusText: 'No Content' })
  })

  it('updateStatus hace PATCH del estado sin force por defecto', () => {
    service.updateStatus('r1', 't1', 'reservada').subscribe()
    const req = http.expectOne(`${base}/t1/status`)
    expect(req.request.method).toBe('PATCH')
    expect(req.request.body).toEqual({ status: 'reservada' })
    expect(req.request.params.has('force')).toBe(false)
    req.flush({})
  })

  it('updateStatus añade force=true cuando se fuerza', () => {
    service.updateStatus('r1', 't1', 'libre', true).subscribe()
    const req = http.expectOne(r => r.url === `${base}/t1/status`)
    expect(req.request.params.get('force')).toBe('true')
    req.flush({})
  })
})
