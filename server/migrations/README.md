# Database Migrations

## Running Migrations

To apply the initial auth schema migration to your Supabase database:

1. **Via Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `001_initial_auth_schema.sql`
   - Run the query

2. **Via Supabase CLI:**
   ```bash
   supabase db push
   ```

3. **Via psql:**
   ```bash
   psql postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE] < 001_initial_auth_schema.sql
   ```

## Migration Files

### 001_initial_auth_schema.sql

Creates the complete authentication schema for username-based auth and user settings:

#### Usernames Table (`public.usernames`)
- Stores original username and fingerprint (homoglyph-normalized)
- Unique constraint on fingerprint prevents lookalike usernames
- Foreign key to `auth.users` with cascade delete
- Supports username-based login as alternative to email

**Function:** `get_email_by_username(username_input text)`
- Converts username to email for login flow
- Used by server API endpoint `/api/auth/login`

**RLS Policies:**
- Public read access (for profile lookups)
- Users can create/update/delete their own username
- **Service role can create usernames** (needed for signup flow after OTP verification)

#### User Settings Table (`public.user_settings`)
- Stores user-specific preferences and settings
- Currently includes timezone preference
- Foreign key to `auth.users` with cascade delete
- Auto-updates `updated_at` timestamp on changes

**RLS Policies:**
- All operations restricted to user's own settings (fully private)

## Environment Setup

After running the migration, configure your server environment:

```bash
# server/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

> ⚠️ **Security:** Use the **service role key** (not anon key) for server-side operations.
> Never expose this key in client-side code.

## Notes

- The usernames INSERT policy allows service role access because username creation happens server-side after OTP verification during signup
- User settings are always created by the authenticated user themselves, so no service role access is needed
- Both tables use Row Level Security (RLS) to enforce access control
