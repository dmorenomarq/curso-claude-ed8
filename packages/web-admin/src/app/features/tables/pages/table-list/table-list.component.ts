import { Component, DestroyRef, inject, OnInit } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TableStore } from '../../store/table.store'
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
  restaurantId = ''

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
}
