import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SUPPORTED_LANGUAGES } from '@app/helpers/constants';
import { MenuLanguageComponent } from './menu-language.component';
import { TranslocoLoader, TranslocoService } from '@jsverse/transloco';
import { NgClass } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { TranslocoHttpLoader } from '@app/services/transloco-loader.service';

describe('MenuLanguageComponent', () => {
  let component: MenuLanguageComponent;
  let fixture: ComponentFixture<MenuLanguageComponent>;
  let mockTranslocoService: jasmine.SpyObj<TranslocoService>;
  let mockTranslocoLoader: jasmine.SpyObj<TranslocoLoader>;

  beforeEach(async () => {
    mockTranslocoService = jasmine.createSpyObj('TranslocoService', ['setActiveLang', 'getActiveLang']);
    mockTranslocoLoader = jasmine.createSpyObj('TranslocoLoader', ['getCountry']);
    
    await TestBed.configureTestingModule({
      imports: [TranslocoDirective, NgClass],
      providers: [
        { provide: TranslocoService, useValue: mockTranslocoService },
        { provide: TranslocoHttpLoader, useValue: mockTranslocoLoader },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MenuLanguageComponent);
    component = fixture.componentInstance;
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

    component.onI18n(event);

    expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('de');
  });

  it('should change language if key-entered', () => {
    const langClass = 'i18n-de';
    const target = {
      closest: () => ({ classList: [langClass] })
    };

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    Object.defineProperty(event, 'target', { value: target });

    component.onI18n(event);

    expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('de');
  });

  it('should not change language if no language class is found', () => {
    const event = {
      target: {
        closest: () => ({ classList: ['some-other-class'] })
      }
    } as unknown as Event;

    component.onI18n(event);

    expect(mockTranslocoService.setActiveLang).not.toHaveBeenCalled();
  });

  it('should stop event propagation', () => {
    const event = new Event('click');
    spyOn(event, 'stopPropagation');

    component.stopEventPropagation(event);

    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('should initialize supportedLanguages and classToLang', () => {
    expect(component.supportedLanguages).toEqual(SUPPORTED_LANGUAGES);
    component.supportedLanguages.forEach(lang => {
      expect(component.classToLang[`i18n-${lang}`]).toBe(lang);
    });
  });
});
