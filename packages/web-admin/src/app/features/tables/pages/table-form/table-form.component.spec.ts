import { importProvidersFrom } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { LucideAngularModule, ChevronLeft } from 'lucide-angular'
import { TableStore } from '../../store/table.store'
import { TableService } from '../../services/table.service'
import { TableFormComponent } from './table-form.component'

describe('TableFormComponent', () => {
  const store = { create: vi.fn(), update: vi.fn() }
  const service = { getById: vi.fn() }
  let router: Router

  function render(id: string | null = null) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        importProvidersFrom(LucideAngularModule.pick({ ChevronLeft })),
        { provide: TableStore, useValue: store },
        { provide: TableService, useValue: service },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { params: { restaurantId: 'r1' } } },
            snapshot: { paramMap: { get: () => id } }
          }
        }
      ]
    })
    router = TestBed.inject(Router)
    vi.spyOn(router, 'navigate').mockResolvedValue(true)
    const fixture = TestBed.createComponent(TableFormComponent)
    fixture.detectChanges()
    return fixture
  }

  beforeEach(() => {
    vi.clearAllMocks()
    store.create.mockResolvedValue(undefined)
    store.update.mockResolvedValue(undefined)
  })

  it('crea la mesa y vuelve al listado', async () => {
    const fixture = render()
    const cmp = fixture.componentInstance
    cmp.form = { number: 3, capacity: 6, description: 'Terraza' }
    await cmp.onSubmit()
    expect(store.create).toHaveBeenCalledWith('r1', { number: 3, capacity: 6, description: 'Terraza' })
    expect(router.navigate).toHaveBeenCalledWith(['/restaurants', 'r1', 'tables'])
  })

  it('convierte la descripción vacía en null', async () => {
    const cmp = render().componentInstance
    cmp.form = { number: 1, capacity: 2, description: '   ' }
    await cmp.onSubmit()
    expect(store.create).toHaveBeenCalledWith('r1', { number: 1, capacity: 2, description: null })
  })

  it('no envía y muestra errores si el número no es un entero >= 1', async () => {
    const fixture = render()
    const cmp = fixture.componentInstance
    cmp.form = { number: 0, capacity: 4, description: null }
    await cmp.onSubmit()
    expect(store.create).not.toHaveBeenCalled()
    expect(cmp.fieldErrors().number).toBe('El número de mesa debe ser un entero mayor o igual que 1.')
    fixture.detectChanges()
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('El número de mesa debe ser un entero')
  })

  it('no envía si la capacidad no es un entero >= 1', async () => {
    const cmp = render().componentInstance
    cmp.form = { number: 1, capacity: 1.5, description: null }
    await cmp.onSubmit()
    expect(store.create).not.toHaveBeenCalled()
    expect(cmp.fieldErrors().capacity).toBe('La capacidad debe ser un entero mayor o igual que 1.')
  })

  it('muestra el mensaje de la API ante un 409 de número duplicado', async () => {
    store.create.mockRejectedValue({
      status: 409,
      error: { error: 'DuplicatedTableNumberError', message: 'Ya existe una mesa con el número 3 en este restaurante' }
    })
    const cmp = render().componentInstance
    cmp.form = { number: 3, capacity: 4, description: null }
    await cmp.onSubmit()
    expect(cmp.error()).toBe('Ya existe una mesa con el número 3 en este restaurante')
    expect(router.navigate).not.toHaveBeenCalled()
    expect(cmp.loading()).toBe(false)
  })

  it('muestra el mensaje de la API ante un 400', async () => {
    store.create.mockRejectedValue({
      status: 400,
      error: { error: 'InvalidTableError', message: 'La capacidad debe ser un entero mayor o igual que 1' }
    })
    const cmp = render().componentInstance
    cmp.form = { number: 3, capacity: 4, description: null }
    await cmp.onSubmit()
    expect(cmp.error()).toBe('La capacidad debe ser un entero mayor o igual que 1')
  })

  it('en edición carga la mesa y actualiza con PUT', async () => {
    service.getById.mockReturnValue(of({
      id: 't1', restaurantId: 'r1', number: 2, description: 'Barra', capacity: 2, status: 'libre',
      partySize: null, occupiedByClientId: null, occupiedAt: null, createdAt: '', updatedAt: ''
    }))
    const fixture = render('t1')
    await fixture.whenStable()
    const cmp = fixture.componentInstance
    expect(cmp.isEditing).toBe(true)
    expect(service.getById).toHaveBeenCalledWith('r1', 't1')
    expect(cmp.form).toEqual({ number: 2, capacity: 2, description: 'Barra' })
    cmp.form = { ...cmp.form, capacity: 4 }
    await cmp.onSubmit()
    expect(store.update).toHaveBeenCalledWith('r1', 't1', { number: 2, capacity: 4, description: 'Barra' })
  })
})
