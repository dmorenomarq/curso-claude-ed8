import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { API_URL } from '@resttek/web-shared'
import { Table } from '../models/table.model'

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly http = inject(HttpClient)
  private readonly apiUrl = inject(API_URL)

  private url(restaurantId: string): string {
    return `${this.apiUrl}/restaurants/${restaurantId}/tables`
  }

  getAvailable(restaurantId: string, partySize: number): Observable<Table[]> {
    return this.http.get<Table[]>(`${this.url(restaurantId)}/available`, { params: { partySize } })
  }

  getMine(restaurantId: string): Observable<Table> {
    return this.http.get<Table>(`${this.url(restaurantId)}/mine`)
  }

  occupy(restaurantId: string, tableId: string, partySize: number): Observable<Table> {
    return this.http.post<Table>(`${this.url(restaurantId)}/${tableId}/occupy`, { partySize })
  }

  release(restaurantId: string, tableId: string): Observable<Table> {
    return this.http.post<Table>(`${this.url(restaurantId)}/${tableId}/release`, {})
  }
}
