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

describe('MenuChangeLogComponent', () => {
  let component: MenuChangeLogComponent;
  let fixture: ComponentFixture<MenuChangeLogComponent>;
  let changeLogServiceMock: Partial<ChangeLogService>;

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

  describe('linkMessage', () => {
    it('should generate a link message with site URL', async () => {
      await setup('patch', 1);

      const msg = component.linkMessage();

      expect(msg).toContain('https://example.com');
      expect(msg).toContain('<a href="https://example.com"');
      expect(msg).toContain('target="_blank"');
    });
  });

});
