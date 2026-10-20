import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { AuthStore } from '@resttek/web-shared'
import { Order } from '../../orders/models/order.model'
import { TableService } from '../services/table.service'
import { TableStore } from '../store/table.store'

@Component({
  selector: 'app-table-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './table-detail.component.html',
  styleUrl: './table-detail.component.css'
})
export class TableDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute)
  private readonly authStore = inject(AuthStore)
  private readonly tableService = inject(TableService)
  private readonly tableStore = inject(TableStore)

  private readonly restaurantId = this.authStore.user()?.restaurantId as string | undefined
  private readonly tableId = this.route.snapshot.paramMap.get('id')
  private pollingInterval: ReturnType<typeof setInterval> | null = null

  private readonly _orders = signal<Order[]>([])
  private readonly _error = signal<string | null>(null)

  readonly orders = this._orders.asReadonly()
  readonly error = this._error.asReadonly()
  readonly table = computed(() => this.tableStore.tables().find(t => t.id === this.tableId))

  ngOnInit(): void {
    if (!this.restaurantId || !this.tableId) return
    this.tableStore.startPolling(this.restaurantId)
    this.loadOrders()
    this.pollingInterval = setInterval(() => this.loadOrders(), 30000)
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling()
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }

  private async loadOrders(): Promise<void> {
    try {
      this._orders.set(await firstValueFrom(this.tableService.getOrders(this.restaurantId!, this.tableId!)))
      this._error.set(null)
    } catch {
      this._error.set('No se pudieron cargar los pedidos de la mesa.')
    }
  }

  getStatusClass(status: string): string {
    return `badge badge-${status}`
  }
}
