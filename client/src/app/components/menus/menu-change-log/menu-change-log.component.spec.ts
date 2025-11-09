import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MenuChangeLogComponent } from './menu-change-log.component';
import { ChangeLogService } from '@app/services/change-log.service';
import { CardModule } from 'primeng/card';
import { signal } from '@angular/core';
import packageJson from 'src/../package.json';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { firstValueFrom } from 'rxjs';
import { OverlayRef } from '@angular/cdk/overlay';

describe('MenuChangeLogComponent', () => {
  let component: MenuChangeLogComponent;
  let fixture: ComponentFixture<MenuChangeLogComponent>;
  let changeLogServiceMock: Partial<ChangeLogService>;
  let overlayRefSpy: jasmine.SpyObj<OverlayRef>;

  const makeMock = (impact: 'patch' | 'minor' | 'major', delta: number) =>
    ({
      appDiff: signal({ impact, delta }),
      appVersion: signal('1.2.0'),
      changes: signal([
        {
          version: '1.2.0',
          date: '2025-10-25',
          description: `${impact} test`,
          changes: ['Some improvements'],
        },
      ]),
    }) satisfies Partial<ChangeLogService>;

  beforeEach(async () => {
    (packageJson as any).siteUrl = 'https://example.com';

    overlayRefSpy = jasmine.createSpyObj('OverlayRef', ['detach', 'hasAttached']);
    overlayRefSpy.hasAttached.and.returnValue(true);
  });

  async function setup(impact: 'patch' | 'minor' | 'major', delta: number) {
    changeLogServiceMock = makeMock(impact, delta);

    await TestBed.configureTestingModule({
      imports: [
        MenuChangeLogComponent,
        CardModule,
        getTranslocoModule(),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ChangeLogService, useValue: changeLogServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuChangeLogComponent);
    component = fixture.componentInstance;
    await firstValueFrom(component.translate.selectTranslate('en'));
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setup('patch', 1);
    expect(component).toBeTruthy();
  });

  describe('semverMessage variations', () => {
    const cases: [impact: 'patch' | 'minor' | 'major', delta: number, expected: string][] = [
      ['patch', 1, 'one patch'],
      ['patch', 3, '3 patches'],
      ['minor', 1, 'one minor version'],
      ['minor', 2, '2 minor versions'],
      ['major', 1, 'one major release'],
      ['major', 5, '5 major releases'],
    ];

    for (const [impact, delta, expected] of cases) {
      it(`should translate correctly for ${impact} (${delta})`, async () => {
        await setup(impact, delta);
        const msg = component.semverMessage();
        expect(msg).toContain(expected);
        expect(msg).toContain('out of date');
      });
    }
  });

  it('should return correct linkMessage', async () => {
    await setup('patch', 1);
    const message = component.linkMessage();
    expect(message).toContain('https://example.com');
  });

  it('should update showMenu signal when closeMenu is called', async () => {
    await setup('patch', 1);
    // Directly set the showMenu signal to simulate menu being open
    component.showMenu.set(true);
    expect(component.showMenu()).toBe(true);

    component.closeMenu();
    expect(component.showMenu()).toBe(false);
  });

  it('should close menu on ngOnDestroy', async () => {
    await setup('patch', 1);
    component.showMenu.set(true);
    expect(component.showMenu()).toBe(true);

    component.ngOnDestroy();
    expect(component.showMenu()).toBe(false);
  });

  describe('toggleMenu', () => {
    it('should open menu when closed', async () => {
      await setup('patch', 1);
      expect(component.showMenu()).toBe(false);

      component.toggleMenu();

      expect(component.showMenu()).toBe(true);
    });

    it('should close menu when open', async () => {
      await setup('patch', 1);
      // First open it
      component.toggleMenu();
      expect(component.showMenu()).toBe(true);

      // Manually set overlayRef to simulate opened state
      (component as any).overlayRef = overlayRefSpy;

      // Then close it
      component.toggleMenu();
      expect(component.showMenu()).toBe(false);
      expect(overlayRefSpy.detach).toHaveBeenCalled();
    });

    it('should create overlay on first open', async () => {
      await setup('patch', 1);
      expect((component as any).overlayRef).toBeNull();

      component.toggleMenu();

      expect((component as any).overlayRef).not.toBeNull();
    });
  });
});
