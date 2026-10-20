import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { environment } from '../../../../environments/environment'
import type { Table, CreateTableDto, TableFilters, TableStatus } from '../models/table.model'

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly http = inject(HttpClient)

  private buildUrl(restaurantId: string): string {
    return `${environment.apiUrl}/restaurants/${restaurantId}/tables`
  }

  getAll(restaurantId: string, filters: TableFilters = {}) {
    let params = new HttpParams()
    if (filters.status) params = params.set('status', filters.status)
    if (filters.minCapacity) params = params.set('minCapacity', filters.minCapacity)
    return this.http.get<Table[]>(this.buildUrl(restaurantId), { params })
  }

  getById(restaurantId: string, id: string) {
    return this.http.get<Table>(`${this.buildUrl(restaurantId)}/${id}`)
  }

  create(restaurantId: string, dto: CreateTableDto) {
    return this.http.post<Table>(this.buildUrl(restaurantId), dto)
  }

  update(restaurantId: string, id: string, dto: CreateTableDto) {
    return this.http.put<Table>(`${this.buildUrl(restaurantId)}/${id}`, dto)
  }

  delete(restaurantId: string, id: string) {
    return this.http.delete<void>(`${this.buildUrl(restaurantId)}/${id}`)
  }

  updateStatus(restaurantId: string, id: string, status: TableStatus, force = false) {
    const params = force ? new HttpParams().set('force', 'true') : new HttpParams()
    return this.http.patch<Table>(`${this.buildUrl(restaurantId)}/${id}/status`, { status }, { params })
  }
}
