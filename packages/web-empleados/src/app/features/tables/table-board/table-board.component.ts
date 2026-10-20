import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { AuthStore } from '@resttek/web-shared'
import { TableStore } from '../store/table.store'
import { Table, TableStatus } from '../models/table.model'

@Component({
  selector: 'app-table-board',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './table-board.component.html',
  styleUrl: './table-board.component.css'
})
export class TableBoardComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore)
  readonly tableStore = inject(TableStore)

  readonly statuses: TableStatus[] = ['libre', 'ocupada', 'reservada']

  private readonly restaurantId = computed<string | undefined>(() => this.authStore.user()?.restaurantId)

  readonly sortedTables = computed(() =>
    [...this.tableStore.tables()].sort((a, b) => a.number - b.number)
  )

  readonly canEdit = computed(() => {
    const role = this.authStore.userRole()
    return role === 'camarero' || role === 'manager' || role === 'admin'
  })

  readonly canForce = computed(() => {
    const role = this.authStore.userRole()
    return role === 'manager' || role === 'admin'
  })

  ngOnInit(): void {
    const restaurantId = this.restaurantId()
    if (restaurantId) {
      this.tableStore.startPolling(restaurantId)
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling()
  }

  changeStatus(table: Table, status: string): void {
    const restaurantId = this.restaurantId()
    if (restaurantId && status !== table.status) {
      this.tableStore.updateStatus(restaurantId, table.id, status as TableStatus)
    }
  }

  force(): void {
    const restaurantId = this.restaurantId()
    if (restaurantId) {
      this.tableStore.forceStatus(restaurantId)
    }
  }

  dismiss(): void {
    this.tableStore.dismissConflict()
  }

  getStatusClass(status: TableStatus): string {
    return `badge badge-mesa-${status}`
  }
}
