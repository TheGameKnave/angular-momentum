# Cookie Consent Implementation Guide

This guide explains how to implement GDPR-compliant cookie consent for Google Analytics and Hotjar.

## Why Cookie Consent?

- **GDPR Requirement**: Non-essential cookies (analytics, marketing) require explicit user consent in EU
- **Current Issue**: GA and Hotjar scripts in `index.html` load automatically without consent
- **Privacy-First**: Give users control over their data

## Overview

You have analytics scripts in `client/src/index.html`:
- Google Analytics (G-NZS60CFH48)
- Hotjar Tracking

These need to be blocked until user consents.

## Implementation Steps

### 1. Install Cookie Consent Library

```bash
cd client
npm install ngx-cookieconsent
```

### 2. Create Cookie Consent Service

**File**: `client/src/app/services/cookie-consent.service.ts`

```typescript
import { Injectable, signal } from '@angular/core';

export type CookieConsentStatus = 'pending' | 'accepted' | 'declined';

@Injectable({
  providedIn: 'root'
})
export class CookieConsentService {
  // Consent state
  readonly consentStatus = signal<CookieConsentStatus>(this.loadConsentStatus());

  private readonly CONSENT_KEY = 'cookie_consent_status';

  /**
   * Load consent status from localStorage
   */
  private loadConsentStatus(): CookieConsentStatus {
    const stored = localStorage.getItem(this.CONSENT_KEY);
    return (stored as CookieConsentStatus) || 'pending';
  }

  /**
   * Accept cookies and load analytics scripts
   */
  acceptCookies(): void {
    localStorage.setItem(this.CONSENT_KEY, 'accepted');
    this.consentStatus.set('accepted');
    this.loadAnalytics();
  }

  /**
   * Decline cookies
   */
  declineCookies(): void {
    localStorage.setItem(this.CONSENT_KEY, 'declined');
    this.consentStatus.set('declined');
  }

  /**
   * Load analytics scripts dynamically
   */
  private loadAnalytics(): void {
    // Load Google Analytics
    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-NZS60CFH48';
    document.head.appendChild(gaScript);

    gaScript.onload = () => {
      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(...args: any[]) { (window as any).dataLayer.push(args); }
      gtag('js', new Date());
      gtag('config', 'G-NZS60CFH48');
    };

    // Load Hotjar
    (function(h: any, o: any, t: any, j: any, a?: any, r?: any) {
      h.hj = h.hj || function() { (h.hj.q = h.hj.q || []).push(arguments); };
      h._hjSettings = { hjid: 6475773, hjsv: 6 };
      a = o.getElementsByTagName('head')[0];
      r = o.createElement('script'); r.async = 1;
      r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
      a.appendChild(r);
    })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');
  }
}
```

### 3. Create Cookie Banner Component

**File**: `client/src/app/components/privacy/cookie-banner/cookie-banner.component.ts`

```typescript
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { CookieConsentService } from '@app/services/cookie-consent.service';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule, TranslocoDirective, ButtonModule],
  template: `
    @if (showBanner()) {
      <div class="cookie-banner" *transloco="let t">
        <div class="cookie-banner-content">
          <p class="cookie-banner-text">
            {{ t('We use cookies to improve your experience and analyze site usage.') }}
            <a href="/privacy" target="_blank" class="cookie-banner-link">
              {{ t('Learn more') }}
            </a>
          </p>
          <div class="cookie-banner-actions">
            <p-button
              [label]="t('Accept')"
              (click)="onAccept()"
              severity="primary"
            />
            <p-button
              [label]="t('Decline')"
              (click)="onDecline()"
              severity="secondary"
              [text]="true"
            />
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cookie-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--surface-card);
      border-top: 1px solid var(--surface-border);
      padding: 1rem;
      z-index: 9999;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
    }

    .cookie-banner-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      flex-wrap: wrap;
    }

    .cookie-banner-text {
      flex: 1;
      margin: 0;
    }

    .cookie-banner-link {
      color: var(--primary-color);
      text-decoration: underline;
    }

    .cookie-banner-actions {
      display: flex;
      gap: 1rem;
    }

    @media (max-width: 768px) {
      .cookie-banner-content {
        flex-direction: column;
        align-items: flex-start;
      }

      .cookie-banner-actions {
        width: 100%;
      }

      .cookie-banner-actions button {
        flex: 1;
      }
    }
  `]
})
export class CookieBannerComponent {
  readonly showBanner = signal(false);

  constructor(private readonly cookieConsent: CookieConsentService) {
    // Only show banner if consent is pending
    this.showBanner.set(this.cookieConsent.consentStatus() === 'pending');
  }

  onAccept(): void {
    this.cookieConsent.acceptCookies();
    this.showBanner.set(false);
  }

  onDecline(): void {
    this.cookieConsent.declineCookies();
    this.showBanner.set(false);
  }
}
```

### 4. Add Cookie Banner to App Component

**File**: `client/src/app/app.component.html`

Add at the end of the file:
```html
<!-- Cookie Consent Banner -->
<app-cookie-banner />
```

**File**: `client/src/app/app.component.ts`

Add to imports:
```typescript
import { CookieBannerComponent } from './components/privacy/cookie-banner/cookie-banner.component';

@Component({
  // ...
  imports: [
    // ... existing imports
    CookieBannerComponent,
  ],
})
```

### 5. Remove Scripts from index.html

**File**: `client/src/index.html`

Remove or comment out the GA and Hotjar scripts:
```html
<!-- REMOVED: Scripts now loaded via CookieConsentService after user consent -->
<!--
<script async src="https://www.googletagmanager.com/gtag/js?id=G-NZS60CFH48"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-NZS60CFH48');
</script>
-->
```

### 6. Add Translation Keys

Add these keys to all translation files:

**Schema** (`tests/translation/translation.schema.json`):
```json
,"We use cookies to improve your experience and analyze site usage.": {
  "type": "string",
  "description": "Cookie consent: Banner message"
}
,"Learn more": {
  "type": "string",
  "description": "Cookie consent: Link to privacy policy"
}
,"Accept": {
  "type": "string",
  "description": "General: Accept button label"
}
,"Decline": {
  "type": "string",
  "description": "General: Decline button label"
}
```

**Translations**:
- **English**: "We use cookies...", "Learn more", "Accept", "Decline"
- **German**: "Wir verwenden Cookies...", "Mehr erfahren", "Akzeptieren", "Ablehnen"
- **Spanish**: "Usamos cookies...", "Más información", "Aceptar", "Rechazar"
- **French**: "Nous utilisons des cookies...", "En savoir plus", "Accepter", "Refuser"
- **Chinese (Simplified)**: "我们使用Cookie...", "了解更多", "接受", "拒绝"
- **Chinese (Traditional)**: "我們使用Cookie...", "了解更多", "接受", "拒絕"

### 7. Optional: Cookie Preferences Page

Create a settings page where users can change their consent:

```typescript
// In profile or settings component
constructor(private cookieConsent: CookieConsentService) {}

get cookieConsentStatus() {
  return this.cookieConsent.consentStatus();
}

changeCookiePreferences(): void {
  if (this.cookieConsentStatus === 'accepted') {
    this.cookieConsent.declineCookies();
  } else {
    this.cookieConsent.acceptCookies();
  }
}
```

## Testing

1. **First Visit**: Banner should appear
2. **Accept**: Banner disappears, GA/Hotjar scripts load
3. **Decline**: Banner disappears, no scripts load
4. **Persistence**: Refresh page, banner doesn't reappear
5. **Clear Storage**: Clear localStorage, banner reappears

## GDPR Compliance Checklist

- ✅ No cookies load before consent
- ✅ Clear explanation of what cookies do
- ✅ Link to privacy policy
- ✅ Easy accept/decline buttons
- ✅ Consent persisted (localStorage)
- ✅ User can change mind later (preferences page)

## Resources

- [GDPR Cookie Consent Guide](https://gdpr.eu/cookies/)
- [ICO Cookie Guidance](https://ico.org.uk/for-organisations/guide-to-pecr/cookies-and-similar-technologies/)
- [Google Analytics GDPR](https://support.google.com/analytics/answer/9019185)
