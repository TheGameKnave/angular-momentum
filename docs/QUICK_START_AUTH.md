# Quick Start: Authentication Setup

## Installation (5 minutes)

1. **Install Supabase client**
   ```bash
   cd client
   npm install @supabase/supabase-js
   ```

2. **Create Supabase project**
   - Go to https://supabase.com
   - Create new project
   - Enable Email authentication in Settings > Authentication > Providers

3. **Add credentials to environment**

   Edit `client/src/environments/environment.ts`:
   ```typescript
   supabase: {
     url: 'https://YOUR-PROJECT.supabase.co',
     publicKey: 'YOUR-ANON-KEY',
   }
   ```

4. **Run the app**
   ```bash
   npm run dev
   ```

## Test the Implementation

1. Navigate to http://localhost:4200/login
2. Sign up in Supabase dashboard or use Supabase auth UI
3. Login with credentials
4. You should be redirected to http://localhost:4200/profile
5. Click logout to return to home

## What's Been Implemented

✅ **Services**
- [platform.service.ts](client/src/app/services/platform.service.ts) - Detect web/Tauri/SSR
- [auth.service.ts](client/src/app/services/auth.service.ts) - Supabase auth integration

✅ **Guards**
- [auth.guard.ts](client/src/app/guards/auth.guard.ts) - Protect authenticated routes
- [public.guard.ts](client/src/app/guards/public.guard.ts) - Redirect logged-in users

✅ **Components**
- [login/](client/src/app/components/pages/login/) - Login page
- [profile/](client/src/app/components/pages/profile/) - User profile page

✅ **Infrastructure**
- [auth.interceptor.ts](client/src/app/interceptors/auth.interceptor.ts) - Auto-add tokens
- [transloco-storage.ts](client/src/app/helpers/transloco-storage.ts) - Platform-aware storage
- Updated routing with guards
- SSR-compatible environment config

## Key Features

### Platform-Aware Authentication
- **Web**: Cookies (SSR-compatible)
- **Tauri**: localStorage + Bearer tokens
- **SSR**: No crashes, reads from request context

### Security
- Homoglyph username validation
- JWT token management
- httpOnly cookies (web)
- Auto token refresh

### Developer Experience
- Signal-based reactive state
- TypeScript types
- Comprehensive error handling
- Translation support

## Usage in Your Code

### Check if user is logged in
```typescript
constructor(private auth: AuthService) {
  if (this.auth.isAuthenticated()) {
    const user = this.auth.currentUser();
    console.log(user.email);
  }
}
```

### Protect a route
```typescript
{
  path: 'admin',
  component: AdminComponent,
  canActivate: [AuthGuard]
}
```

### Platform detection
```typescript
constructor(private platform: PlatformService) {
  if (this.platform.isTauri()) {
    // Tauri-specific code
  }
}
```

## Next Steps

- Add social auth providers (Google, GitHub)
- Implement password reset flow
- Add email verification
- Create user settings page
- Add avatar upload

## Documentation

See [AUTH_IMPLEMENTATION.md](AUTH_IMPLEMENTATION.md) for complete documentation.

---

**Ready to use!** 🚀
