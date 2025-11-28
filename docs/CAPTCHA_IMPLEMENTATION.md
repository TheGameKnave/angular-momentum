# CAPTCHA Implementation Guide

This guide explains how to add Cloudflare Turnstile CAPTCHA to the signup form.

## Why Cloudflare Turnstile?

- **Free**: No cost for any volume
- **Privacy-friendly**: GDPR compliant, no tracking
- **Non-onerous**: Invisible/minimal friction for users
- **Easy integration**: Simple Angular component
- **No Google dependency**: Independent from reCAPTCHA

## Setup Steps

### 1. Get Cloudflare Turnstile Keys

1. Go to https://dash.cloudflare.com
2. Navigate to Turnstile in the sidebar
3. Create a new site
4. Get your **Site Key** (public) and **Secret Key** (private)

### 2. Install Dependencies

```bash
cd client
npm install ngx-turnstile
```

### 3. Add Environment Variables

**Client** (`client/src/environments/environment.ts` and other env files):
```typescript
export const ENVIRONMENT = {
  // ... existing config
  turnstile_site_key: 'YOUR_SITE_KEY_HERE', // Add this
};
```

**Server** (`server/.env`):
```env
TURNSTILE_SECRET_KEY=YOUR_SECRET_KEY_HERE
```

**Server Config** (`server/config/environment.ts`):
```typescript
export default {
  // ... existing config
  turnstile_secret_key: process.env.TURNSTILE_SECRET_KEY || '',
};
```

### 4. Update Signup Component

**TypeScript** (`client/src/app/components/menus/menu-auth/auth/auth-signup/auth-signup.component.ts`):

```typescript
import { NgxTurnstileModule } from 'ngx-turnstile';
import { ENVIRONMENT } from 'src/environments/environment';

@Component({
  // ... existing config
  imports: [
    // ... existing imports
    NgxTurnstileModule,
  ],
})
export class AuthSignupComponent {
  // Add turnstile properties
  readonly turnstileSiteKey = ENVIRONMENT.turnstile_site_key;
  readonly turnstileToken = signal<string | null>(null);

  constructor(/* ... existing dependencies */) {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, emailValidator()]],
      username: ['', [usernameValidator()]],
      password: ['', [Validators.required, passwordComplexityValidator()]],
      confirmPassword: ['', [Validators.required]],
      ageVerification: [false, [Validators.requiredTrue]],
      privacyPolicy: [false, [Validators.requiredTrue]],
      turnstile: ['', [Validators.required]], // Add this
    }, { validators: passwordMatchValidator() });
  }

  /**
   * Handle Turnstile token received
   */
  onTurnstileResolved(token: string): void {
    this.turnstileToken.set(token);
    this.signupForm.patchValue({ turnstile: token });
  }

  /**
   * Handle Turnstile error
   */
  onTurnstileError(): void {
    this.turnstileToken.set(null);
    this.signupForm.patchValue({ turnstile: '' });
    this.errorMessage.set('CAPTCHA verification failed. Please try again.');
  }

  async onSubmit(): Promise<void> {
    if (this.signupForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, username, password } = this.signupForm.value;
    const turnstileToken = this.turnstileToken();

    // Pass turnstile token to signup
    const result = await this.authService.signUp(email, password, username, turnstileToken);

    this.loading.set(false);

    if (result.error) {
      this.errorMessage.set(result.error.message);
      return;
    }

    this.signupSuccess.emit({ email, username: username || undefined });
  }
}
```

**HTML** (`client/src/app/components/menus/menu-auth/auth/auth-signup/auth-signup.component.html`):

Add this after the privacy policy checkbox and before the error message:

```html
  <!-- Turnstile CAPTCHA -->
  <div class="form-field">
    <ngx-turnstile
      [siteKey]="turnstileSiteKey"
      (resolved)="onTurnstileResolved($event)"
      (errored)="onTurnstileError()"
      theme="light"
    />
  </div>
```

### 5. Update Auth Service

**Client** (`client/src/app/services/auth.service.ts`):

```typescript
async signUp(email: string, password: string, username?: string, turnstileToken?: string | null): Promise<AuthResult> {
  try {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || null,
          turnstile_token: turnstileToken || null, // Add this
        },
      },
    });

    // ... rest of existing code
  }
}
```

### 6. Add Server-Side Verification

**Create Turnstile Service** (`server/services/turnstileService.ts`):

This service is already created and handles token verification.

**Add Webhook Endpoint** (`server/routes/auth.routes.ts`):

The webhook endpoint at `POST /api/auth/webhook/signup-verification` has been added to verify CAPTCHA tokens after Supabase signup.

### 7. Configure Supabase Webhook

To enable server-side CAPTCHA verification, you need to set up a webhook in Supabase:

1. **Go to Supabase Dashboard** → Your Project → Authentication
2. **Navigate to Hooks** (in the left sidebar under Authentication)
3. **Add a new hook** with these settings:
   - **Hook Type**: Select "User Signup" (triggers after user creation)
   - **URL**: `https://angularmomentum.app/api/auth/webhook/signup-verification`
   - **HTTP Method**: POST
   - **Secret**: (optional - for webhook signature verification, not currently implemented)
   - **Enabled**: ✓ (check the box)

4. **Save the hook**

**How it works:**
- When a user signs up via the client, Supabase creates the user account
- Supabase immediately calls your webhook with the user data
- The webhook verifies the `turnstile_token` from user metadata
- If verification fails, the webhook deletes the user account
- If verification succeeds, the user account remains active

**Testing the webhook:**
- For local development, use a service like [ngrok](https://ngrok.com/) to expose your local server
- Update the webhook URL to your ngrok URL: `https://your-ngrok-url.ngrok.io/api/auth/webhook/signup-verification`
- Test signup flow and check server logs for webhook activity

**Webhook payload example:**
```json
{
  "type": "INSERT",
  "table": "users",
  "record": {
    "id": "user-uuid-here",
    "email": "user@example.com",
    "raw_user_meta_data": {
      "username": "optional-username",
      "turnstile_token": "captcha-token-here"
    }
  }
}
```

### 8. Testing

1. **Development**: Use Cloudflare's test site key `1x00000000000000000000AA` for testing (always passes)
2. **Production**: Use your real site key
3. **Localhost**: Turnstile works on localhost without additional configuration

### 9. Fallback

If Turnstile is not configured (no site key), the signup form will still work but without CAPTCHA protection. Add this check in the component:

```typescript
get hasCaptcha(): boolean {
  return !!this.turnstileSiteKey && this.turnstileSiteKey !== '';
}
```

Then in the HTML:
```html
@if (hasCaptcha) {
  <div class="form-field">
    <ngx-turnstile ... />
  </div>
}
```

### 10. Resources

- [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/)
- [ngx-turnstile GitHub](https://github.com/maxmilton/ngx-turnstile)
- [Get Turnstile Keys](https://dash.cloudflare.com/?to=/:account/turnstile)
- [Supabase Webhooks Documentation](https://supabase.com/docs/guides/auth/auth-hooks)
