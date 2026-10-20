import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { Order } from '../../orders/models/order.model'
import { Table, TableStatus, UpdateTableStatusDto } from '../models/table.model'
import { environment } from '../../../../environments/environment'

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly http = inject(HttpClient)

  private url(restaurantId: string): string {
    return `${environment.apiUrl}/restaurants/${restaurantId}/tables`
  }

  getAll(restaurantId: string): Observable<Table[]> {
    const params = new HttpParams().set('include', 'activeOrders')
    return this.http.get<Table[]>(this.url(restaurantId), { params })
  }

  updateStatus(restaurantId: string, tableId: string, status: TableStatus, force = false): Observable<Table> {
    const dto: UpdateTableStatusDto = { status }
    const params = force ? new HttpParams().set('force', 'true') : new HttpParams()
    return this.http.patch<Table>(`${this.url(restaurantId)}/${tableId}/status`, dto, { params })
  }

  getOrders(restaurantId: string, tableId: string): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.url(restaurantId)}/${tableId}/orders`)
  }
}
