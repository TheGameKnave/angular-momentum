import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CookieBannerComponent } from './cookie-banner.component';
import { CookieConsentService } from '@app/services/cookie-consent.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { signal } from '@angular/core';

describe('CookieBannerComponent', () => {
  let component: CookieBannerComponent;
  let fixture: ComponentFixture<CookieBannerComponent>;
  let mockCookieConsentService: jasmine.SpyObj<CookieConsentService>;
  let consentStatusSignal: ReturnType<typeof signal<'accepted' | 'declined' | 'pending'>>;

  beforeEach(async () => {
    consentStatusSignal = signal<'accepted' | 'declined' | 'pending'>('pending');

    mockCookieConsentService = jasmine.createSpyObj('CookieConsentService',
      ['acceptCookies', 'declineCookies'],
      { consentStatus: consentStatusSignal }
    );

    await TestBed.configureTestingModule({
      imports: [
        CookieBannerComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: CookieConsentService, useValue: mockCookieConsentService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CookieBannerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show banner when consent status is pending', () => {
    consentStatusSignal.set('pending');
    expect(component.showBanner()).toBe(true);
  });

  it('should hide banner when consent status is accepted', () => {
    consentStatusSignal.set('accepted');
    expect(component.showBanner()).toBe(false);
  });

  it('should hide banner when consent status is declined', () => {
    consentStatusSignal.set('declined');
    expect(component.showBanner()).toBe(false);
  });

  it('should call acceptCookies when onAccept is called', () => {
    component.onAccept();
    expect(mockCookieConsentService.acceptCookies).toHaveBeenCalled();
  });

  it('should call declineCookies when onDecline is called', () => {
    component.onDecline();
    expect(mockCookieConsentService.declineCookies).toHaveBeenCalled();
  });
});
