import { Injectable, inject, signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { Table, TableInUseError, TableStatus } from '../models/table.model'
import { TableService } from '../services/table.service'

export interface TableConflict {
  tableId: string
  status: TableStatus
  message: string
  pendingItems: number
}

@Injectable({ providedIn: 'root' })
export class TableStore {
  private readonly tableService = inject(TableService)

  private readonly _tables = signal<Table[]>([])
  private readonly _loading = signal(false)
  private readonly _error = signal<string | null>(null)
  private readonly _conflict = signal<TableConflict | null>(null)

  private pollingInterval: ReturnType<typeof setInterval> | null = null

  readonly tables = this._tables.asReadonly()
  readonly loading = this._loading.asReadonly()
  readonly error = this._error.asReadonly()
  readonly conflict = this._conflict.asReadonly()

  async loadTables(restaurantId: string): Promise<void> {
    this._loading.set(true)
    this._error.set(null)
    try {
      this._tables.set(await firstValueFrom(this.tableService.getAll(restaurantId)))
    } catch {
      this._error.set('No se pudieron cargar las mesas.')
    } finally {
      this._loading.set(false)
    }
  }

  async updateStatus(restaurantId: string, tableId: string, status: TableStatus, force = false): Promise<boolean> {
    this._error.set(null)
    try {
      const updated = await firstValueFrom(this.tableService.updateStatus(restaurantId, tableId, status, force))
      this._tables.update(tables => tables.map(t => (t.id === tableId ? { ...t, ...updated, activeOrders: t.activeOrders } : t)))
      this._conflict.set(null)
      return true
    } catch (err) {
      const body = err instanceof HttpErrorResponse ? err.error : null
      if (err instanceof HttpErrorResponse && err.status === 409 && body?.error === 'TableInUseError') {
        const inUse = body as TableInUseError
        this._conflict.set({ tableId, status, message: inUse.message, pendingItems: inUse.pendingItems })
      } else {
        this._error.set(body?.message || 'No se pudo cambiar el estado de la mesa.')
      }
      return false
    }
  }

  forceStatus(restaurantId: string): Promise<boolean> {
    const conflict = this._conflict()
    if (!conflict) return Promise.resolve(false)
    return this.updateStatus(restaurantId, conflict.tableId, conflict.status, true)
  }

  dismissConflict(): void {
    this._conflict.set(null)
  }

  startPolling(restaurantId: string): void {
    this.stopPolling()
    this.loadTables(restaurantId)
    this.pollingInterval = setInterval(() => {
      this.loadTables(restaurantId)
    }, 30000)
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }
}
