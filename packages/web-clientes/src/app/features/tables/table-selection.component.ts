import { Component, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { TableService } from '../../core/services/table.service'
import { CartStore } from '../../core/store/cart.store'
import { Table } from '../../core/models/table.model'

@Component({
  selector: 'app-table-selection',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
          <h1>Elige tu mesa</h1>
          <p>Indica cuántas personas sois y selecciona una mesa disponible</p>
        </div>
      </div>

      <div class="party-form card">
        <label for="party-size">Número de personas</label>
        <input id="party-size" class="form-control" type="number" min="1" step="1"
               [value]="partySizeInput()" (input)="setPartySize($any($event.target).value)" />
        <button class="btn btn-primary" [disabled]="!validPartySize() || loading()" (click)="search()">
          Ver mesas
        </button>
      </div>

      @if (error()) {
        <div class="alert-error">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (searched()) {
        @if (tables().length === 0) {
          <div class="empty-state">
            <p>No hay mesas disponibles para {{ searchedPartySize() }} personas</p>
          </div>
        } @else {
          <div class="table-grid">
            @for (table of tables(); track table.id) {
              <button type="button" class="table-card card"
                      [class.selected]="selected()?.id === table.id" (click)="select(table)">
                <h3>Mesa {{ table.number }}</h3>
                <p>{{ table.capacity }} personas</p>
                @if (table.description) {
                  <p class="description">{{ table.description }}</p>
                }
              </button>
            }
          </div>
        }

        <div class="actions">
          <button class="btn btn-primary continue-btn" [disabled]="!selected() || occupying()" (click)="continue()">
            {{ occupying() ? 'Reservando mesa...' : 'Continuar' }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .container { max-width: 900px; margin: 0 auto; }
    .party-form { display: flex; align-items: center; gap: 12px; padding: 16px; margin-bottom: 20px; }
    .party-form input { width: 100px; }
    .table-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .table-card { padding: 16px; text-align: left; cursor: pointer; transition: all var(--transition); }
    .table-card:hover, .table-card.selected { border-color: var(--green-medium); }
    .table-card.selected { background: var(--bg-hover); }
    .table-card h3 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
    .table-card p { color: var(--text-secondary); font-size: 13px; }
    .table-card .description { color: var(--text-muted); margin-top: 4px; }
    .actions { margin-top: 20px; display: flex; justify-content: flex-end; }
  `]
})
export class TableSelectionComponent {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly tableService = inject(TableService)
  private readonly cartStore = inject(CartStore)

  private readonly restaurantId = this.route.snapshot.paramMap.get('id') as string

  readonly partySizeInput = signal('2')
  readonly tables = signal<Table[]>([])
  readonly selected = signal<Table | null>(null)
  readonly searched = signal(false)
  readonly searchedPartySize = signal(0)
  readonly loading = signal(false)
  readonly occupying = signal(false)
  readonly error = signal<string | null>(null)

  setPartySize(value: string): void {
    this.partySizeInput.set(value)
  }

  validPartySize(): boolean {
    return this.parsePartySize() !== null
  }

  search(): void {
    const partySize = this.parsePartySize()
    if (partySize === null) return

    this.loading.set(true)
    this.error.set(null)
    this.selected.set(null)

    this.tableService.getAvailable(this.restaurantId, partySize).subscribe({
      next: (tables) => {
        this.tables.set(tables)
        this.searchedPartySize.set(partySize)
        this.searched.set(true)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Error al cargar las mesas disponibles')
        this.loading.set(false)
      }
    })
  }

  select(table: Table): void {
    this.selected.set(table)
  }

  continue(): void {
    const table = this.selected()
    if (!table) return

    this.occupying.set(true)
    this.error.set(null)

    this.tableService.occupy(this.restaurantId, table.id, this.searchedPartySize()).subscribe({
      next: (occupied) => {
        this.cartStore.setTable(occupied.id)
        this.router.navigate(['/restaurants', this.restaurantId])
      },
      error: () => {
        this.error.set('No se pudo reservar la mesa. Inténtalo de nuevo.')
        this.occupying.set(false)
      }
    })
  }

  private parsePartySize(): number | null {
    const raw = this.partySizeInput().trim()
    if (!/^\d+$/.test(raw)) return null
    const value = Number(raw)
    return value >= 1 ? value : null
  }
}
