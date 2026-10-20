import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { AuthStore } from '@resttek/web-shared'
import { TableStore } from '../../store/table.store'
import { isTableInUse, tableErrorMessage } from '../../models/table-error'
import { TABLE_STATUSES, TABLE_STATUS_LABELS } from '../../models/table.model'
import type { Table, TableStatus } from '../../models/table.model'

@Component({
  selector: 'app-table-list',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './table-list.component.html',
  styleUrl: './table-list.component.css'
})
export class TableListComponent implements OnInit {
  readonly store = inject(TableStore)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)
  private readonly authStore = inject(AuthStore)
  restaurantId = ''
  readonly actionError = signal<string | null>(null)
  readonly canForce = computed(() => ['admin', 'manager'].includes(this.authStore.userRole() ?? ''))

  readonly statuses = TABLE_STATUSES

  ngOnInit(): void {
    this.route.parent?.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.restaurantId = params.get('restaurantId') ?? ''
        if (this.restaurantId) {
          this.store.loadByRestaurant(this.restaurantId)
        }
      })
  }

  onStatusFilter(value: string): void {
    this.store.setFilters({ status: (value || null) as TableStatus | null })
  }

  onCapacityFilter(value: string): void {
    const capacity = Number.parseInt(value, 10)
    this.store.setFilters({ minCapacity: capacity >= 1 ? capacity : null })
  }

  statusLabel(status: TableStatus): string {
    return TABLE_STATUS_LABELS[status]
  }

  occupancy(table: Table): string {
    if (table.status !== 'ocupada') return '—'
    const parts: string[] = []
    if (table.partySize) parts.push(`${table.partySize} ${table.partySize === 1 ? 'persona' : 'personas'}`)
    if (table.occupiedAt) {
      const time = new Date(table.occupiedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      parts.push(`desde ${time}`)
    }
    return parts.length ? parts.join(' · ') : '—'
  }

  async onDelete(table: Table): Promise<void> {
    if (!this.restaurantId) return
    if (!confirm(`¿Estás seguro de eliminar la mesa ${table.number}?`)) return
    this.actionError.set(null)
    try {
      await this.store.delete(this.restaurantId, table.id)
    } catch (err) {
      this.actionError.set(tableErrorMessage(err, 'Error al eliminar la mesa.'))
    }
  }

  async onChangeStatus(table: Table, status: TableStatus): Promise<void> {
    if (!this.restaurantId || status === table.status) return
    this.actionError.set(null)
    try {
      await this.store.updateStatus(this.restaurantId, table.id, status)
    } catch (err) {
      if (isTableInUse(err) && this.canForce()) {
        const message = tableErrorMessage(err, '')
        if (confirm(`${message}. ¿Quieres forzar el cambio a "${TABLE_STATUS_LABELS[status]}"?`)) {
          await this.forceStatus(table, status)
        }
        return
      }
      this.actionError.set(tableErrorMessage(err, 'Error al cambiar el estado de la mesa.'))
    }
  }

  private async forceStatus(table: Table, status: TableStatus): Promise<void> {
    try {
      await this.store.updateStatus(this.restaurantId, table.id, status, true)
    } catch (err) {
      this.actionError.set(tableErrorMessage(err, 'Error al cambiar el estado de la mesa.'))
    }
  }
}
