import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { AuthService, AuthStore } from '@resttek/web-shared'
import { LucideAngularModule, Flame, Beer, Armchair, LayoutGrid, LogOut } from 'lucide-angular'
import { ShellComponent } from './shell.component'
import { routes } from '../../app.routes'

describe('ShellComponent: menú de mesas', () => {
  function links(role: string): string[] {
    TestBed.configureTestingModule({
      imports: [LucideAngularModule.pick({ Flame, Beer, Armchair, LayoutGrid, LogOut })],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: { logout: vi.fn() } },
        { provide: AuthStore, useValue: { user: () => ({ restaurantId: 'r1', firstName: 'A', lastName: 'B' }), userRole: () => role } }
      ]
    })
    const fixture = TestBed.createComponent(ShellComponent)
    fixture.detectChanges()
    const anchors = Array.from(fixture.nativeElement.querySelectorAll('.nav-item')) as HTMLAnchorElement[]
    return anchors.map(a => a.getAttribute('href') as string)
  }

  it.each(['camarero', 'manager', 'cocinero'])('%s ve la entrada Mesas', role => {
    expect(links(role)).toContain('/mesas')
  })

  it('las rutas incluyen el listado y el detalle de mesas', () => {
    const children = routes.find(r => r.path === '')?.children ?? []
    const paths = children.map(r => r.path)
    expect(paths).toContain('mesas')
    expect(paths).toContain('mesas/:id')
  })
})
