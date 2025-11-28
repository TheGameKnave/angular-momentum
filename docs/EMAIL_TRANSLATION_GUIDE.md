# Email Translation Guide

This guide explains how to translate verification code emails sent by Supabase Auth.

## Overview

Supabase Auth sends emails for various authentication flows:
- Email verification (signup)
- Magic link authentication
- Password reset
- Email change confirmation

By default, these emails are in English. Here's how to add multi-language support.

## Approach 1: Supabase Dashboard Templates (Recommended for Simple Cases)

### Step 1: Access Email Templates

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Authentication > Email Templates**
3. You'll see templates for:
   - Confirm signup
   - Magic Link
   - Change Email Address
   - Reset Password

### Step 2: Customize Templates with Language Detection

Supabase email templates support **variables** and basic logic. You can use the user's metadata to determine language:

```html
<!-- Confirm Signup Template Example -->
<h2>
  {{ if .UserMetaData.language == "es" }}
    Confirma tu correo electrónico
  {{ else if .UserMetaData.language == "fr" }}
    Confirmez votre adresse e-mail
  {{ else if .UserMetaData.language == "de" }}
    Bestätige deine E-Mail-Adresse
  {{ else }}
    Confirm your email address
  {{ end }}
</h2>

<p>
  {{ if .UserMetaData.language == "es" }}
    Hemos enviado un código de verificación de 6 dígitos:
  {{ else if .UserMetaData.language == "fr" }}
    Nous avons envoyé un code de vérification à 6 chiffres:
  {{ else if .UserMetaData.language == "de" }}
    Wir haben einen 6-stelligen Bestätigungscode gesendet:
  {{ else }}
    We’ve sent a 6-digit verification code:
  {{ end }}
</p>

<h1 style="font-size: 32px; text-align: center; letter-spacing: 8px;">
  {{ .Token }}
</h1>

<p>
  {{ if .UserMetaData.language == "es" }}
    Este código expira en 60 minutos.
  {{ else if .UserMetaData.language == "fr" }}
    Ce code expire dans 60 minutes.
  {{ else if .UserMetaData.language == "de" }}
    Dieser Code läuft in 60 Minuten ab.
  {{ else }}
    This code expires in 60 minutes.
  {{ end }}
</p>
```

### Step 3: Pass Language When Signing Up

Update your signup code to include the user's language in metadata:

```typescript
// client/src/app/services/auth.service.ts

async signup(email: string, password: string, username?: string): Promise<void> {
  // Get current language from Transloco
  const currentLang = this.translocoService.getActiveLang();

  const { data, error } = await this.supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username || null,
        language: currentLang  // Add this!
      }
    }
  });

  if (error) throw error;
}
```

### Limitations:
- Template syntax is limited (no full programming language)
- Need to maintain HTML in dashboard (not version-controlled)
- Can become unwieldy with many languages

## Approach 2: Custom Email Service (Recommended for Production)

For better control and maintainability, use a custom email service:

### Architecture:
```
User Signup → Client → Server → Custom Email Service → User's Inbox
                ↓
         Supabase Auth
         (disable emails)
```

### Step 1: Disable Supabase Auth Emails

In Supabase Dashboard:
1. Go to **Authentication > Email Templates**
2. Uncheck "Enable Email Confirmations" for templates you'll handle custom

### Step 2: Create Email Service

```typescript
// server/services/emailService.ts

import { Resend } from 'resend';
import { render } from '@react-email/render';
import { VerificationEmail } from '../emails/VerificationEmail';

export class EmailService {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  /**
   * Send verification code email in user's preferred language.
   */
  async sendVerificationCode(
    email: string,
    code: string,
    language: string = 'en'
  ): Promise<void> {
    const html = render(
      VerificationEmail({ code, language })
    );

    await this.resend.emails.send({
      from: 'noreply@yourdomain.com',
      to: email,
      subject: this.getSubject(language),
      html
    });
  }

  private getSubject(language: string): string {
    const subjects: Record<string, string> = {
      'en': 'Verify your email address',
      'es': 'Verifica tu correo electrónico',
      'fr': 'Vérifiez votre adresse e-mail',
      'de': 'Bestätige deine E-Mail-Adresse',
      'zh-CN': '验证您的电子邮件地址',
      'zh-TW': '驗證您的電子郵件地址'
    };
    return subjects[language] || subjects['en'];
  }
}
```

### Step 3: Create Email Templates

Using [React Email](https://react.email/) for maintainable templates:

```typescript
// server/emails/VerificationEmail.tsx

import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Section,
} from '@react-email/components';

interface VerificationEmailProps {
  code: string;
  language: string;
}

const translations = {
  en: {
    title: "Verify your email address",
    message: "We’ve sent a 6-digit verification code:",
    expires: "This code expires in 60 minutes.",
  },
  es: {
    title: "Verifica tu correo electrónico",
    message: "Hemos enviado un código de verificación de 6 dígitos:",
    expires: "Este código expira en 60 minutos.",
  },
  fr: {
    title: "Vérifiez votre adresse e-mail",
    message: "Nous avons envoyé un code de vérification à 6 chiffres:",
    expires: "Ce code expire dans 60 minutes.",
  },
  de: {
    title: "Bestätige deine E-Mail-Adresse",
    message: "Wir haben einen 6-stelligen Bestätigungscode gesendet:",
    expires: "Dieser Code läuft in 60 Minuten ab.",
  },
  'zh-CN': {
    title: "验证您的电子邮件地址",
    message: "我们已向以下地址发送了6位验证码：",
    expires: "此代码将在60分钟后过期。",
  },
  'zh-TW': {
    title: "驗證您的電子郵件地址",
    message: "我們已向以下地址發送了6位驗證碼：",
    expires: "此代碼將在60分鐘後過期。",
  },
};

export const VerificationEmail = ({
  code,
  language = 'en'
}: VerificationEmailProps) => {
  const t = translations[language] || translations.en;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{t.title}</Heading>
          <Text style={text}>{t.message}</Text>

          <Section style={codeContainer}>
            <Text style={codeText}>{code}</Text>
          </Section>

          <Text style={footer}>{t.expires}</Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  textAlign: 'center' as const,
};

const codeContainer = {
  background: '#f4f4f4',
  borderRadius: '4px',
  margin: '16px auto 14px',
  verticalAlign: 'middle',
  width: '280px',
};

const codeText = {
  color: '#000',
  display: 'inline-block',
  fontFamily: 'monospace',
  fontSize: '32px',
  fontWeight: 700,
  letterSpacing: '8px',
  lineHeight: '40px',
  paddingBottom: '8px',
  paddingTop: '8px',
  margin: '0 auto',
  width: '100%',
  textAlign: 'center' as const,
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
};
```

### Step 4: Handle Signup with Custom Emails

```typescript
// server/graphql/mutations/signup.ts

export const signupResolver = async (
  _parent: unknown,
  args: { email: string; password: string; username?: string },
  context: Context
) => {
  const { email, password, username } = args;
  const language = context.req.headers['accept-language']?.split(',')[0] || 'en';

  // Create user in Supabase (with email confirmation disabled)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,  // We'll handle confirmation
    user_metadata: {
      username: username || null,
      language
    }
  });

  if (error) throw error;

  // Generate OTP code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Store code in database with expiration
  await storeVerificationCode(data.user.id, code);

  // Send custom email
  const emailService = new EmailService(process.env.RESEND_API_KEY!);
  await emailService.sendVerificationCode(email, code, language);

  return { success: true, userId: data.user.id };
};
```

### Benefits:
- ✅ Full version control for email templates
- ✅ Preview emails in development
- ✅ Type-safe with TypeScript
- ✅ Easy to test
- ✅ Support for complex layouts
- ✅ Better analytics (open rates, click rates)

## Approach 3: Hybrid (Supabase + Edge Functions)

Use Supabase Edge Functions to intercept auth emails:

```typescript
// supabase/functions/send-verification-email/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { email, token, language } = await req.json();

  // Call your custom email service
  const emailService = new EmailService();
  await emailService.sendVerificationCode(email, token, language);

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## Recommendations

| Use Case | Recommended Approach |
|----------|---------------------|
| MVP/Prototype | Approach 1 (Supabase Templates) |
| Production App | Approach 2 (Custom Email Service) |
| Supabase-only Stack | Approach 3 (Edge Functions) |

## Next Steps

1. **Choose your approach** based on your requirements
2. **Update signup flow** to capture user's language preference
3. **Test emails** in all supported languages
4. **Monitor deliverability** and adjust as needed

## Resources

- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [React Email](https://react.email/)
- [Resend](https://resend.com/) - Modern email API
- [Nodemailer](https://nodemailer.com/) - Alternative email library
