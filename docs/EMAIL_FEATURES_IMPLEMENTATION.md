# Email Features Implementation Guide

This guide covers implementing email change functionality and security email notifications.

## Table of Contents

1. [Email Change Functionality](#email-change-functionality)
2. [Security Email Notifications](#security-email-notifications)
3. [Email Whitelisting Instructions](#email-whitelisting-instructions)

---

## Email Change Functionality

### Overview

Allow users to change their email address from the profile page. This requires:
- Email verification (send code to new email)
- Re-authentication (verify current password)
- Update Supabase auth email

### Implementation Steps

#### 1. Add UI to Profile Component

**File**: `client/src/app/components/pages/profile/profile.component.html`

> Note: The profile component exists at this path. Email change functionality may need to be added.

Add after username section:

```html
<!-- Change Email -->
<p-panel toggler="header" [toggleable]="true" [collapsed]="!emailPanelExpanded()">
  <ng-template pTemplate="header">
    <div class="flex items-center gap-2">
      <i class="pi pi-envelope"></i>
      <span>{{ t('Change Email') }}</span>
    </div>
  </ng-template>

  <form [formGroup]="emailForm" (ngSubmit)="onSubmitEmailChange()" class="flex flex-col gap-4">
    <!-- Current Email (display only) -->
    <div class="form-field">
      <label>{{ t('Current Email') }}</label>
      <input
        pInputText
        type="email"
        [value]="authService.currentUser()?.email || ''"
        [disabled]="true"
        class="w-full"
      />
    </div>

    <!-- New Email -->
    <div class="form-field">
      <label for="new-email">{{ t('New Email') }}</label>
      <input
        pInputText
        id="new-email"
        formControlName="newEmail"
        type="email"
        [placeholder]="t('Enter your new email')"
        class="w-full"
      />
      @if (emailForm.get('newEmail')?.invalid && emailForm.get('newEmail')?.touched) {
        <small class="error-message">{{ t('Email is required') }}</small>
      }
    </div>

    <!-- Current Password (for re-authentication) -->
    <div class="form-field">
      <label for="email-current-password">{{ t('Current Password') }}</label>
      <input
        pInputText
        id="email-current-password"
        formControlName="currentPassword"
        type="password"
        [placeholder]="t('Enter your current password')"
        class="w-full"
      />
      @if (emailForm.get('currentPassword')?.invalid && emailForm.get('currentPassword')?.touched) {
        <small class="error-message">{{ t('Current password is required') }}</small>
      }
    </div>

    <!-- Error Message -->
    @if (emailError()) {
      <p-message severity="error" [text]="emailError()!" styleClass="w-full" />
    }

    <!-- Success Message -->
    @if (emailSuccess()) {
      <p-message severity="success" [text]="t('Verification email sent! Check your new email address.')" styleClass="w-full" />
    }

    <!-- Submit Button -->
    <p-button
      type="submit"
      [label]="t('Send Verification Email')"
      [loading]="emailLoading()"
      [disabled]="emailForm.invalid"
      styleClass="w-full"
    />
  </form>
</p-panel>
```

#### 2. Add TypeScript Logic

**File**: `client/src/app/components/pages/profile/profile.component.ts`

```typescript
// Add to class properties
readonly emailPanelExpanded = signal(false);
readonly emailLoading = signal(false);
readonly emailError = signal<string | null>(null);
readonly emailSuccess = signal(false);
emailForm: FormGroup;

// In constructor, initialize form
this.emailForm = this.fb.group({
  newEmail: ['', [Validators.required, Validators.email]],
  currentPassword: ['', [Validators.required]],
});

/**
 * Handle email change form submission
 */
async onSubmitEmailChange(): Promise<void> {
  if (this.emailForm.invalid) {
    return;
  }

  this.emailLoading.set(true);
  this.emailError.set(null);
  this.emailSuccess.set(false);

  const { newEmail, currentPassword } = this.emailForm.value;
  const currentEmail = this.authService.currentUser()?.email;

  if (!currentEmail) {
    this.emailError.set('Unable to get current email');
    this.emailLoading.set(false);
    return;
  }

  // Step 1: Re-authenticate with current password
  const { error: loginError } = await this.authService.login({
    email: currentEmail,
    password: currentPassword
  });

  if (loginError) {
    this.emailError.set(this.translocoService.translate('Current password is incorrect'));
    this.emailLoading.set(false);
    return;
  }

  // Step 2: Request email change (sends verification to new email)
  const { error } = await this.authService.updateEmail(newEmail);

  this.emailLoading.set(false);

  if (error) {
    this.emailError.set(error.message);
    return;
  }

  // Success!
  this.emailSuccess.set(true);
  this.emailForm.reset();
}
```

#### 3. Add Auth Service Method

**File**: `client/src/app/services/auth.service.ts`

```typescript
/**
 * Update user email address.
 * Sends verification email to new address.
 * User must click link in email to confirm change.
 */
async updateEmail(newEmail: string): Promise<{ error: Error | null }> {
  if (!this.supabase) {
    return { error: new Error('Supabase not initialized') };
  }

  try {
    const { error } = await this.supabase.auth.updateUser({
      email: newEmail
    });

    if (error) {
      this.logService.log('Error updating email:', error);
      return { error };
    }

    this.logService.log('Email update initiated, verification sent');
    return { error: null };
  } catch (error) {
    this.logService.log('Email update exception', error);
    return { error: error as Error };
  }
}
```

#### 4. Add Translation Keys

Add to all translation files:

```json
"Change Email": "Change Email / E-Mail ändern / Cambiar correo / Changer l'adresse e-mail / 更改电子邮件",
"Current Email": "Current Email / Aktuelle E-Mail / Correo actual / E-mail actuel / 当前电子邮件",
"New Email": "New Email / Neue E-Mail / Nuevo correo / Nouvelle adresse e-mail / 新电子邮件",
"Enter your new email": "Enter your new email / Neue E-Mail eingeben / Ingrese su nuevo correo / Entrez votre nouvelle adresse e-mail / 输入您的新电子邮件",
"Send Verification Email": "Send Verification Email / Bestätigungs-E-Mail senden / Enviar correo de verificación / Envoyer un e-mail de vérification / 发送验证电子邮件",
"Verification email sent! Check your new email address.": "Verification email sent! Check your new email address. / Bestätigungs-E-Mail gesendet! Überprüfen Sie Ihre neue E-Mail-Adresse. / ¡Correo de verificación enviado! Revise su nueva dirección de correo. / E-mail de vérification envoyé ! Vérifiez votre nouvelle adresse e-mail. / 验证电子邮件已发送！检查您的新电子邮件地址。"
```

### How It Works

1. User enters new email and current password
2. System re-authenticates user with current password (security check)
3. Supabase sends verification email to NEW email address
4. User clicks link in email to confirm change
5. Email is updated in Supabase Auth

---

## Security Email Notifications

### Overview

Send email notifications for security-critical events:
- Password changed
- Email changed
- Account deletion requested
- Login from new device/location (optional)

### Using Supabase Email Templates

Supabase can send emails automatically for auth events. Configure templates in Supabase Dashboard.

#### 1. Configure Supabase Email Templates

Go to: **Supabase Dashboard → Authentication → Email Templates**

Edit these templates:

**Password Reset Template** (already exists):
```
Hi {{ .Email }},

You requested to reset your password. Click the link below:

{{ .ConfirmationURL }}

If you didn't request this, please ignore this email.

Best,
Angular Momentum Team
```

**Email Change Template**:
```
Hi {{ .Email }},

You requested to change your email address. Click the link below to confirm:

{{ .ConfirmationURL }}

If you didn't request this, please secure your account immediately.

Best,
Angular Momentum Team
```

**Magic Link Template** (for passwordless login):
```
Hi {{ .Email }},

Click the link below to sign in:

{{ .ConfirmationURL }}

This link expires in 1 hour.

Best,
Angular Momentum Team
```

#### 2. Custom Email Notifications

For events not covered by Supabase (password changed, account deleted), you'll need a custom email service.

##### Option A: Use Supabase Edge Functions

Create an edge function to send emails via a service like SendGrid, Resend, or AWS SES.

**File**: `supabase/functions/send-security-email/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  const { email, type } = await req.json();

  const templates = {
    password_changed: {
      subject: 'Your password was changed',
      html: `
        <p>Hi,</p>
        <p>Your password was recently changed.</p>
        <p>If you didn't make this change, please reset your password immediately and contact support.</p>
      `
    },
    account_deleted: {
      subject: 'Your account was deleted',
      html: `
        <p>Hi,</p>
        <p>Your account has been permanently deleted.</p>
        <p>If you didn't request this, please contact support immediately.</p>
      `
    }
  };

  const template = templates[type as keyof typeof templates];

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'noreply@angularmomentum.app',
      to: email,
      subject: template.subject,
      html: template.html
    })
  });

  return new Response(JSON.stringify({ sent: response.ok }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

##### Option B: Server-Side Email Service

**File**: `server/services/emailService.ts`

```typescript
import nodemailer from 'nodemailer';
import config from '../config/environment';

export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: true,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_password
      }
    });
  }

  async sendPasswordChangedEmail(email: string): Promise<void> {
    await this.transporter.sendMail({
      from: '"Angular Momentum" <noreply@angularmomentum.app>',
      to: email,
      subject: 'Your password was changed',
      html: `
        <p>Hi,</p>
        <p>Your password was recently changed.</p>
        <p>If you didn't make this change, please reset your password immediately.</p>
      `
    });
  }

  async sendAccountDeletedEmail(email: string): Promise<void> {
    await this.transporter.sendMail({
      from: '"Angular Momentum" <noreply@angularmomentum.app>',
      to: email,
      subject: 'Your account was deleted',
      html: `
        <p>Hi,</p>
        <p>Your account has been permanently deleted.</p>
        <p>If you didn't request this, please contact support immediately.</p>
      `
    });
  }
}
```

#### 3. Trigger Emails in Auth Endpoints

**File**: `server/routes/auth.routes.ts`

```typescript
import { EmailService } from '../services/emailService';

const emailService = new EmailService();

// In password change endpoint (after successful password update)
router.put('/password', async (req, res) => {
  // ... existing password update logic

  // Send security notification
  await emailService.sendPasswordChangedEmail(user.email);

  res.json({ success: true });
});

// In account deletion endpoint (before deleting account)
router.delete('/delete-account', async (req, res) => {
  const email = user.email;

  // ... existing account deletion logic

  // Send notification (before user is deleted)
  await emailService.sendAccountDeletedEmail(email);

  res.json({ success: true });
});
```

---

## Email Whitelisting Instructions

### For Supabase Emails

**Verification emails come from**: `mail.app.supabase.io`

### User Instructions

Add this to verification email template or help docs:

```markdown
## Not Receiving Emails?

Our verification emails come from `mail.app.supabase.io`.

**Please whitelist this domain:**

### Gmail
1. Click the gear icon → See all settings
2. Go to "Filters and Blocked Addresses"
3. Create a new filter
4. From: `*@mail.app.supabase.io`
5. Click "Create filter"
6. Check "Never send it to Spam"
7. Click "Create filter"

### Outlook
1. Click Settings → View all Outlook settings
2. Go to Mail → Junk email
3. Add `mail.app.supabase.io` to Safe senders

### Yahoo
1. Click Settings → More Settings
2. Go to Filters
3. Add a new filter for emails from `mail.app.supabase.io`
4. Choose "Inbox" as destination

### Apple Mail
1. Open Mail preferences
2. Go to Rules
3. Add rule: If sender contains "mail.app.supabase.io", move to Inbox
```

### Add to Verification Email Template

Update the OTP email template in Supabase to include:

```
If you didn't receive this email, check your spam folder.
To ensure you receive our emails, please whitelist mail.app.supabase.io
```

---

## Summary Checklist

### Email Change
- [ ] Add email change form to profile
- [ ] Implement re-authentication
- [ ] Call `supabase.auth.updateUser({ email })`
- [ ] Add translations
- [ ] Test verification flow

### Security Notifications
- [ ] Configure Supabase email templates
- [ ] Implement custom email service (Resend, SendGrid, etc.)
- [ ] Send email on password change
- [ ] Send email on account deletion
- [ ] Add whitelisting instructions to emails

### Email Whitelisting
- [ ] Update email templates with whitelist instructions
- [ ] Add help docs with email provider-specific steps
- [ ] Include `mail.app.supabase.io` in all instructions

## Resources

- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Nodemailer Docs](https://nodemailer.com/)
- [Resend API](https://resend.com/docs/introduction)
- [SendGrid API](https://docs.sendgrid.com/)
