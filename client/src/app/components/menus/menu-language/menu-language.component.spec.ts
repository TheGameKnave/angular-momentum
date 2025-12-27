import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SUPPORTED_LANGUAGES } from '@app/constants/app.constants';
import { MenuLanguageComponent } from './menu-language.component';
import { TranslocoService } from '@jsverse/transloco';
import { TranslocoHttpLoader } from '@app/services/transloco-loader.service';
import { UserSettingsService } from '@app/services/user-settings.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';

describe('MenuLanguageComponent', () => {
  let component: MenuLanguageComponent;
  let fixture: ComponentFixture<MenuLanguageComponent>;
  let translocoService: TranslocoService;
  let mockTranslocoLoader: jasmine.SpyObj<TranslocoHttpLoader>;
  let mockUserSettingsService: jasmine.SpyObj<UserSettingsService>;

  beforeEach(async () => {
    mockTranslocoLoader = jasmine.createSpyObj('TranslocoHttpLoader', ['getCountry', 'getNativeName']);
    mockTranslocoLoader.getCountry.and.returnValue('us');
    mockTranslocoLoader.getNativeName.and.returnValue('English');

    mockUserSettingsService = jasmine.createSpyObj('UserSettingsService', ['updateLanguagePreference']);
    mockUserSettingsService.updateLanguagePreference.and.returnValue(Promise.resolve(null));

    await TestBed.configureTestingModule({
      imports: [
        MenuLanguageComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: TranslocoHttpLoader, useValue: mockTranslocoLoader },
        { provide: UserSettingsService, useValue: mockUserSettingsService },
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

  it('should change language and persist to server if clicked', () => {
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
    expect(mockUserSettingsService.updateLanguagePreference).toHaveBeenCalledWith('de');
  });

  it('should change language and persist to server if key-entered', () => {
    const langClass = 'i18n-de';
    const target = {
      closest: () => ({ classList: [langClass] })
    };

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    Object.defineProperty(event, 'target', { value: target });

    spyOn(translocoService, 'setActiveLang');
    component.onI18n(event);

    expect(translocoService.setActiveLang).toHaveBeenCalledWith('de');
    expect(mockUserSettingsService.updateLanguagePreference).toHaveBeenCalledWith('de');
  });

  it('should not change language if no language class is found', () => {
    const event = {
      target: {
        closest: () => ({ classList: ['some-other-class'] })
      },
      type: 'click'
    } as unknown as Event;

    spyOn(translocoService, 'setActiveLang');
    component.onI18n(event);

    expect(translocoService.setActiveLang).not.toHaveBeenCalled();
  });

  it('should not change language if target closest returns null', () => {
    const event = {
      target: {
        closest: () => null
      },
      type: 'click'
    } as unknown as Event;

    spyOn(translocoService, 'setActiveLang');
    component.onI18n(event);

    expect(translocoService.setActiveLang).not.toHaveBeenCalled();
  });

  it('should not change language for non-click/enter events', () => {
    const langClass = 'i18n-de';
    const event = {
      target: {
        closest: () => ({ classList: [langClass] })
      },
      type: 'mouseover'
    } as unknown as Event;

    spyOn(translocoService, 'setActiveLang');
    component.onI18n(event);

    expect(translocoService.setActiveLang).not.toHaveBeenCalled();
  });
});
