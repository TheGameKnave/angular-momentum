import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrivacyPolicyComponent } from './privacy-policy.component';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CookieConsentService } from '@app/services/cookie-consent.service';
import { SeoService } from '@app/services/seo.service';
import { signal } from '@angular/core';

describe('PrivacyPolicyComponent', () => {
  let component: PrivacyPolicyComponent;
  let fixture: ComponentFixture<PrivacyPolicyComponent>;
  let mockCookieConsentService: jasmine.SpyObj<CookieConsentService>;
  let mockSeoService: jasmine.SpyObj<SeoService>;

  beforeEach(async () => {
    mockSeoService = jasmine.createSpyObj('SeoService', ['updateTags']);
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
        { provide: SeoService, useValue: mockSeoService },
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

  it('should set SEO tags on init', () => {
    fixture.detectChanges();
    expect(mockSeoService.updateTags).toHaveBeenCalledWith({
      title: 'Privacy Policy - Angular Momentum',
      description: 'Privacy policy for Angular Momentum. Learn how we collect, use, and protect your data.',
      type: 'article',
    });
  });
});
