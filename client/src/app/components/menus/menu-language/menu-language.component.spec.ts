import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SUPPORTED_LANGUAGES } from '@app/helpers/constants';
import { MenuLanguageComponent } from './menu-language.component';
import { TranslocoService } from '@jsverse/transloco';
import { TranslocoHttpLoader } from '@app/services/transloco-loader.service';
import { OverlayRef } from '@angular/cdk/overlay';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('MenuLanguageComponent', () => {
  let component: MenuLanguageComponent;
  let fixture: ComponentFixture<MenuLanguageComponent>;
  let translocoService: TranslocoService;
  let mockTranslocoLoader: jasmine.SpyObj<TranslocoHttpLoader>;
  let overlayRefSpy: jasmine.SpyObj<OverlayRef>;

  beforeEach(async () => {
    mockTranslocoLoader = jasmine.createSpyObj('TranslocoHttpLoader', ['getCountry', 'getNativeName']);
    mockTranslocoLoader.getCountry.and.returnValue('us');
    mockTranslocoLoader.getNativeName.and.returnValue('English');

    overlayRefSpy = jasmine.createSpyObj('OverlayRef', ['detach', 'hasAttached']);
    overlayRefSpy.hasAttached.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [
        MenuLanguageComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: TranslocoHttpLoader, useValue: mockTranslocoLoader },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MenuLanguageComponent);
    component = fixture.componentInstance;
    translocoService = TestBed.inject(TranslocoService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize supportedLanguages and classToLang', () => {
    expect(component.supportedLanguages).toEqual(SUPPORTED_LANGUAGES);
    component.supportedLanguages.forEach(lang => {
      expect(component.classToLang[`i18n-${lang}`]).toBe(lang);
    });
  });

  it('should change language if clicked', () => {
    const langClass = 'i18n-de';
    const event = {
      target: {
        closest: () => ({ classList: [langClass] })
      },
      type: 'click'
    } as unknown as Event;

    spyOn(translocoService, 'setActiveLang');
    component.onI18n(event);

    expect(translocoService.setActiveLang).toHaveBeenCalledWith('de');
  });

  it('should change language if key-entered', () => {
    const langClass = 'i18n-de';
    const target = {
      closest: () => ({ classList: [langClass] })
    };

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    Object.defineProperty(event, 'target', { value: target });

    spyOn(translocoService, 'setActiveLang');
    component.onI18n(event);

    expect(translocoService.setActiveLang).toHaveBeenCalledWith('de');
  });

  it('should not change language if no language class is found', () => {
    const event = {
      target: {
        closest: () => ({ classList: ['some-other-class'] })
      }
    } as unknown as Event;

    spyOn(translocoService, 'setActiveLang');
    component.onI18n(event);

    expect(translocoService.setActiveLang).not.toHaveBeenCalled();
  });

  it('should initialize supportedLanguages and classToLang', () => {
    expect(component.supportedLanguages).toEqual(SUPPORTED_LANGUAGES);
    component.supportedLanguages.forEach(lang => {
      expect(component.classToLang[`i18n-${lang}`]).toBe(lang);
    });
  });

  it('should update showMenu signal when closeMenu is called', () => {
    // Directly set the showMenu signal to simulate menu being open
    component.showMenu.set(true);
    expect(component.showMenu()).toBe(true);

    component.closeMenu();
    expect(component.showMenu()).toBe(false);
  });

  it('should close menu on ngOnDestroy', () => {
    component.showMenu.set(true);
    expect(component.showMenu()).toBe(true);

    component.ngOnDestroy();
    expect(component.showMenu()).toBe(false);
  });

  describe('toggleMenu', () => {
    it('should open menu when closed', () => {
      fixture.detectChanges();
      expect(component.showMenu()).toBe(false);

      component.toggleMenu();

      expect(component.showMenu()).toBe(true);
    });

    it('should close menu when open', () => {
      fixture.detectChanges();
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

    it('should create overlay on first open', () => {
      fixture.detectChanges();
      expect((component as any).overlayRef).toBeNull();

      component.toggleMenu();

      expect((component as any).overlayRef).not.toBeNull();
    });
  });
});
