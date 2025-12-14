import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrivacyPolicyComponent } from './privacy-policy.component';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CookieConsentService } from '@app/services/cookie-consent.service';
import { signal } from '@angular/core';

describe('PrivacyPolicyComponent', () => {
  let component: PrivacyPolicyComponent;
  let fixture: ComponentFixture<PrivacyPolicyComponent>;
  let mockCookieConsentService: jasmine.SpyObj<CookieConsentService>;

  beforeEach(async () => {
    mockCookieConsentService = jasmine.createSpyObj('CookieConsentService',
      ['acceptCookies', 'declineCookies'],
      { consentStatus: signal<'accepted' | 'declined' | 'pending'>('pending') }
    );

    await TestBed.configureTestingModule({
      imports: [
        PrivacyPolicyComponent,
        getTranslocoModule(),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CookieConsentService, useValue: mockCookieConsentService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyPolicyComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have privacyPolicyUrl property set to correct path', () => {
    expect(component.privacyPolicyUrl).toBe('/assets/docs/privacy.md');
  });

  it('should have companyName property from APP_METADATA', () => {
    expect(component.companyName).toBe('GameKnave Design');
  });

  it('should have privacyUpdatedDate formatted as medium date', () => {
    // The date should be formatted according to locale
    expect(component.privacyUpdatedDate).toBeTruthy();
    // Should contain Oct or October depending on locale
    expect(component.privacyUpdatedDate).toMatch(/Oct|2025/);
  });

  it('should call acceptCookies when onAcceptCookies is called', () => {
    component.onAcceptCookies();
    expect(mockCookieConsentService.acceptCookies).toHaveBeenCalled();
  });

  it('should call declineCookies when onDeclineCookies is called', () => {
    component.onDeclineCookies();
    expect(mockCookieConsentService.declineCookies).toHaveBeenCalled();
  });
});
