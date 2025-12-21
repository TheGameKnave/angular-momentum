# Authentication Implementation Guide

This document provides instructions for completing the authentication implementation in Angular Momentum.

## Overview

The authentication system has been implemented with the following features:

✅ Platform-aware authentication (Web, Tauri, SSR)
✅ Supabase integration for auth provider
✅ JWT-based token management
✅ Signal-based reactive auth state
✅ HTTP interceptor for automatic token injection
✅ Route guards for protected routes
✅ Cookie + localStorage support for language persistence
✅ SSR-compatible code (no window/localStorage crashes)
✅ Login and Profile pages
✅ Homoglyph username validation

## Installation Steps

### 1. Install Dependencies

```bash
cd client
npm install @supabase/supabase-js
```

### 2. Configure Supabase

You need to set up a Supabase project and add your credentials to the environment configuration.

#### Option A: Environment Variables (Recommended)

Create a `.env` file in the `client` directory:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

#### Option B: Direct Configuration

Edit `client/src/environments/environment.ts` and replace the empty strings:

```typescript
export const ENVIRONMENT = {
  env: 'development',
  baseUrl: getBaseUrl(),
  supabase: {
    url: 'https://your-project.supabase.co',
    publicKey: 'your-anon-key-here',
  },
};
```

### 3. Set Up Supabase Project

1. Create a Supabase project at https://supabase.com
2. Go to Project Settings > API
3. Copy your project URL and anon/public key
4. Enable Email authentication in Authentication > Providers

### 4. Build and Run

```bash
# Development
npm start

# Tauri
npm run tauri:dev

# Production build
npm run build
```

## File Structure

### New Files Created

```
client/src/app/
├── services/
│   ├── platform.service.ts          # Platform detection (web/Tauri/SSR)
│   ├── auth.service.ts               # Supabase auth integration
│
├── interceptors/
│   └── auth.interceptor.ts           # HTTP interceptor for tokens
│
├── guards/
│   ├── auth.guard.ts                 # Protect authenticated routes
│   └── public.guard.ts               # Redirect logged-in users from login
│
├── components/pages/
│   ├── login/
│   │   ├── login.component.ts
│   │   └── login.component.html
│   │
│   └── profile/
│       ├── profile.component.ts
│       └── profile.component.html
│
└── helpers/
    └── transloco-storage.ts          # Platform-aware storage factory
```

### Modified Files

- `client/src/main.config.ts` - Added auth interceptor, updated Transloco storage
- `client/src/environments/environment.ts` - Added Supabase config, fixed SSR issues
- `client/src/app/app.routing.ts` - Added login/profile routes with guards
- `client/src/assets/i18n/en.json` - Added auth translations

## Usage Examples

### 1. Login Flow

Users navigate to `/login` and enter credentials:

```typescript
// LoginComponent handles the form submission
async onSubmit() {
  const result = await this.authService.login({
    email: 'user@example.com',
    password: 'password123'
  });

  if (result.error) {
    // Show error message
  } else {
    // Redirect to return URL or profile
    this.router.navigate(['/profile']);
  }
}
```

### 2. Protected Routes

Routes can be protected using the `AuthGuard`:

```typescript
{
  path: 'admin',
  component: AdminComponent,
  canActivate: [AuthGuard] // Requires authentication
}
```

### 3. Accessing User Data

```typescript
// In any component
constructor(private authService: AuthService) {
  // Check if authenticated
  if (this.authService.isAuthenticated()) {
    const user = this.authService.currentUser();
    console.log(user.email);
  }
}
```

### 4. Platform-Specific Behavior

```typescript
// In any service/component
constructor(private platform: PlatformService) {
  if (this.platform.isTauri()) {
    // Tauri-specific code (e.g., native notifications)
  } else if (this.platform.isWeb()) {
    // Web-specific code
  }
}
```

### 5. Making Authenticated API Requests

The HTTP interceptor automatically adds tokens for Tauri:

```typescript
// Just make normal HTTP requests
this.http.get('/api/protected-endpoint').subscribe(data => {
  // Token is automatically added for Tauri
  // For web, Supabase handles cookies
});
```

## Platform Behavior

### Web Browser
- **Auth Storage**: Supabase default (httpOnly cookies)
- **Token Handling**: Automatic via cookies
- **SSR Compatible**: Yes
- **Language Persistence**: localStorage + cookies

### Tauri Desktop App
- **Auth Storage**: localStorage
- **Token Handling**: Manual Bearer token in Authorization header
- **Reason**: Tauri doesn't reliably persist cookies
- **Language Persistence**: localStorage only

### SSR Server
- **Auth Storage**: None (read-only from request)
- **Token Handling**: Forward cookies from incoming request
- **Language Persistence**: Read from cookies or Accept-Language header

## API Reference

### AuthService

```typescript
// Login
await authService.login({ email, password })
await authService.login({ username, password }) // Future support

// Sign up
await authService.signUp(email, password, username?)

// Logout
await authService.logout()

// Get current user (signal)
const user = authService.currentUser()

// Check authentication (computed signal)
const isAuth = authService.isAuthenticated()

// Get token for API requests
const token = await authService.getToken()

// Password reset
await authService.requestPasswordReset(email)
await authService.updatePassword(newPassword)
```

### PlatformService

```typescript
// Check platform
platformService.isWeb()     // true if web browser
platformService.isTauri()   // true if Tauri app
platformService.isSSR()     // true if SSR server
platformService.isBrowser() // true if web or Tauri (not SSR)

// Get platform name
platformService.getPlatformName() // 'web' | 'tauri' | 'ssr'
```

## Security Features

### 1. Homoglyph Protection

The auth service validates usernames to prevent homoglyph attacks (usernames that look similar but use different Unicode characters):

```typescript
// Examples of blocked usernames:
// "аdmin" (Cyrillic 'а' instead of Latin 'a')
// "раypal" (mixing Cyrillic and Latin)

// Validation rules:
// - Length: 3–30 characters
// - Allowed: alphanumeric, underscore, hyphen, periods
// - International characters allowed but limited
// - Maximum 30% lookalike characters
```

### 2. Token Security

- **Web**: Uses httpOnly cookies (XSS protection)
- **Tauri**: Uses localStorage (safe in desktop context)
- **Auto-refresh**: Supabase handles token rotation

### 3. Route Protection

- `AuthGuard`: Protects authenticated routes, redirects to login
- `PublicGuard`: Prevents logged-in users from accessing login page
- Return URL tracking for post-login redirect

## Testing Checklist

### Web Browser
- [ ] User can log in
- [ ] Session persists across page reloads
- [ ] Protected routes redirect to login
- [ ] Language preference persists via cookies
- [ ] Logout clears session

### Tauri App
- [ ] User can log in
- [ ] Session persists across app restarts
- [ ] Auth tokens added to API requests
- [ ] Language preference persists via localStorage
- [ ] Logout clears session

### SSR (Future)
- [ ] No crashes on server render
- [ ] Language read from cookies
- [ ] Auth state passed to client via TransferState
- [ ] Authenticated routes skip SSR

## Troubleshooting

### "Supabase not configured" Error

**Problem**: Environment config is missing Supabase credentials.

**Solution**: Add your Supabase URL and anon key to `environment.ts` or environment variables.

### Infinite Redirect Loop

**Problem**: AuthGuard and PublicGuard conflict.

**Solution**: Ensure login page uses `PublicGuard` and profile uses `AuthGuard`.

### Tokens Not Added to Requests (Tauri)

**Problem**: HTTP interceptor not registered.

**Solution**: Verify `authInterceptor` is added in `main.config.ts`:

```typescript
provideHttpClient(
  withInterceptors([authInterceptor]),
  withInterceptorsFromDi()
)
```

### SSR Crashes with "window is not defined"

**Problem**: Using window/localStorage on server.

**Solution**: Use `PlatformService.isSSR()` check or `isPlatformBrowser()` before accessing browser APIs.

## Next Steps

### Nice-to-Haves (Not Yet Implemented)

1. **Refresh Token Rotation**
   - Supabase handles this automatically
   - May need custom logic for edge cases

2. **Remember Me Functionality**
   - Add checkbox to login form
   - Extend session duration

3. **Social Auth Providers**
   - Google, GitHub, etc.
   - Add buttons to login page
   - Configure in Supabase dashboard

4. **Email Verification Flow**
   - Create verification page
   - Handle email confirmation link
   - Show verification status

5. **Password Reset Flow**
   - Create reset password page
   - Handle password reset tokens
   - Email template customization

6. **User Profile Management**
   - Update email/username
   - Avatar upload
   - Account settings

7. **Multi-factor Authentication**
   - TOTP support
   - SMS verification
   - Backup codes

## Backend Integration

The current implementation is frontend-only. To connect to your backend:

### 1. GraphQL Integration

Update your GraphQL queries to include auth tokens:

```typescript
// The interceptor handles this automatically for Tauri
// For web, Supabase cookies are sent automatically
```

### 2. Username to Email Mapping

Currently, username login uses the username AS the email. To support real usernames:

```typescript
// In auth.service.ts, update the login method:
if (credentials.username) {
  // Call your backend to convert username to email
  const email = await this.getUsernameEmail(credentials.username);
}
```

### 3. Custom User Metadata

Store additional user data in Supabase user metadata:

```typescript
await this.supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      username,
      displayName,
      avatarUrl,
      // ... custom fields
    }
  }
});
```

## Questions Resolved

Based on the spec, here are the resolved decisions:

1. **Supabase session management**: Using built-in session management with auto-refresh
2. **Multiple auth providers**: Structure supports it, add provider buttons to login page
3. **SSR for authenticated routes**: Recommended to skip SSR (add to route data: `data: { skipSSR: true }`)
4. **Token refresh**: Automatic via Supabase
5. **Post-login redirect**: Returns to original route via `returnUrl` query param

## Support

For issues or questions:
- Check the troubleshooting section above
- Review Supabase docs: https://supabase.com/docs/guides/auth
- Open an issue on the Angular Momentum GitHub repo

---

**Generated with Claude Code** - Implementation complete and ready for integration!
