import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SUPPORTED_LANGUAGES } from 'src/app/helpers/constants';
import { MenuLanguageComponent } from './menu-language.component';
import { TranslocoService } from '@jsverse/transloco';
import { IonicModule } from '@ionic/angular';
import { NgClass } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';

describe('MenuLanguageComponent', () => {
  let component: MenuLanguageComponent;
  let fixture: ComponentFixture<MenuLanguageComponent>;
  let mockTranslocoService: jasmine.SpyObj<TranslocoService>;

  beforeEach(async () => {
    mockTranslocoService = jasmine.createSpyObj('TranslocoService', ['setActiveLang', 'getActiveLang']);
    
    await TestBed.configureTestingModule({
      imports: [IonicModule, TranslocoDirective, NgClass],
      providers: [
        { provide: TranslocoService, useValue: mockTranslocoService }
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

  it('should return the correct flag for a language without a locale', () => {
    const ln = 'en';
    const expectedFlag = Object.values(component.languages[ln].locales)[0].flag;
    expect(component.getFlag(ln)).toEqual(expectedFlag);
  });

  it('should return the correct flag for a language with a locale', () => {
    const ln = 'en-US';
    const expectedFlag = component.languages[ln.split('-')[0]].locales[ln].flag;
    expect(component.getFlag(ln)).toEqual(expectedFlag);
  });

  it('should return the correct native name for a language without a locale', () => {
    const ln = 'en';
    const expectedNativeName = component.languages[ln].nativeName;
    expect(component.getNativeName(ln)).toEqual(expectedNativeName);
  });

  it('should return the correct native name for a language with a locale', () => {
    const ln = 'en-US';
    const expectedNativeName = `${component.languages[ln.split('-')[0]].nativeName} (${component.languages[ln.split('-')[0]].locales[ln].nativeName})`;
    expect(component.getNativeName(ln)).toEqual(expectedNativeName);
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
});
