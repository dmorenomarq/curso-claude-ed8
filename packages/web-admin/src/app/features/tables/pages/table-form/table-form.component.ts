import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { TableStore } from '../../store/table.store'
import { TableService } from '../../services/table.service'
import { tableErrorMessage } from '../../models/table-error'
import type { CreateTableDto } from '../../models/table.model'

interface TableFormValue {
  number: number | null
  capacity: number | null
  description: string | null
}

@Component({
  selector: 'app-table-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './table-form.component.html',
  styleUrl: './table-form.component.css'
})
export class TableFormComponent implements OnInit {
  private readonly store = inject(TableStore)
  private readonly service = inject(TableService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  isEditing = false
  tableId: string | null = null
  restaurantId = ''
  loading = signal(false)
  error = signal<string | null>(null)
  private readonly submitted = signal(false)

  form: TableFormValue = { number: null, capacity: null, description: null }

  readonly fieldErrors = computed(() => this.submitted() ? this.validate() : {})

  get pageTitle(): string {
    return this.isEditing ? 'Editar mesa' : 'Nueva mesa'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/tables`
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')

    if (id && this.restaurantId) {
      this.isEditing = true
      this.tableId = id
      this.loadTable()
    }
  }

  private async loadTable(): Promise<void> {
    this.loading.set(true)
    try {
      const table = await firstValueFrom(this.service.getById(this.restaurantId, this.tableId!))
      this.form = { number: table.number, capacity: table.capacity, description: table.description }
    } catch (err) {
      this.error.set(tableErrorMessage(err, 'No se pudo cargar la mesa.'))
    } finally {
      this.loading.set(false)
    }
  }

  private validate(): { number?: string; capacity?: string } {
    const errors: { number?: string; capacity?: string } = {}
    if (!Number.isInteger(this.form.number) || this.form.number! < 1) {
      errors.number = 'El número de mesa debe ser un entero mayor o igual que 1.'
    }
    if (!Number.isInteger(this.form.capacity) || this.form.capacity! < 1) {
      errors.capacity = 'La capacidad debe ser un entero mayor o igual que 1.'
    }
    return errors
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    this.submitted.set(true)
    if (Object.keys(this.validate()).length > 0) return

    const dto: CreateTableDto = {
      number: this.form.number!,
      capacity: this.form.capacity!,
      description: this.form.description?.trim() || null
    }

    this.loading.set(true)
    try {
      if (this.isEditing && this.tableId) {
        await this.store.update(this.restaurantId, this.tableId, dto)
      } else {
        await this.store.create(this.restaurantId, dto)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'tables'])
    } catch (err) {
      this.error.set(tableErrorMessage(err, 'Error al guardar la mesa.'))
    } finally {
      this.loading.set(false)
    }
  }
}
