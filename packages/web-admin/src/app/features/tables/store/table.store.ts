import { Injectable, inject, signal, computed } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { TableService } from '../services/table.service'
import type { Table, CreateTableDto, TableFilters, TableStatus } from '../models/table.model'

const byNumber = (a: Table, b: Table) => a.number - b.number

@Injectable({ providedIn: 'root' })
export class TableStore {
  private readonly service = inject(TableService)

  private readonly _tables = signal<Table[]>([])
  private readonly _loading = signal(false)
  private readonly _error = signal<string | null>(null)
  private readonly _filters = signal<TableFilters>({})

  readonly tables = this._tables.asReadonly()
  readonly loading = this._loading.asReadonly()
  readonly error = this._error.asReadonly()
  readonly filters = this._filters.asReadonly()
  readonly filteredTables = computed(() => {
    const { status, minCapacity } = this._filters()
    return this._tables().filter(t =>
      (!status || t.status === status) && (!minCapacity || t.capacity >= minCapacity)
    )
  })

  async loadByRestaurant(restaurantId: string): Promise<void> {
    this._loading.set(true)
    this._error.set(null)
    try {
      this._tables.set(await firstValueFrom(this.service.getAll(restaurantId)))
    } catch {
      this._error.set('No se pudieron cargar las mesas.')
    } finally {
      this._loading.set(false)
    }
  }

  setFilters(filters: TableFilters): void {
    this._filters.update(current => ({ ...current, ...filters }))
  }

  clearFilters(): void {
    this._filters.set({})
  }

  async create(restaurantId: string, dto: CreateTableDto): Promise<void> {
    const table = await firstValueFrom(this.service.create(restaurantId, dto))
    this._tables.update(list => [...list, table].sort(byNumber))
  }

  async update(restaurantId: string, id: string, dto: CreateTableDto): Promise<void> {
    const updated = await firstValueFrom(this.service.update(restaurantId, id, dto))
    this._tables.update(list => list.map(t => t.id === id ? updated : t).sort(byNumber))
  }

  async delete(restaurantId: string, id: string): Promise<void> {
    await firstValueFrom(this.service.delete(restaurantId, id))
    this._tables.update(list => list.filter(t => t.id !== id))
  }

  async updateStatus(restaurantId: string, id: string, status: TableStatus, force = false): Promise<void> {
    const updated = await firstValueFrom(this.service.updateStatus(restaurantId, id, status, force))
    this._tables.update(list => list.map(t => t.id === id ? updated : t))
  }
}
