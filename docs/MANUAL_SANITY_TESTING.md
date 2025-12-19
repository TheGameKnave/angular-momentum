# Manual Testing Guide

This document covers manual testing scenarios that are difficult to automate with e2e tests. These should be verified during UAT before major releases.

## IndexedDB Migrations

### Testing Migration Upgrades

To test migrations step-by-step:

1. **Reset to a specific version:**
   - Open DevTools → Application/Storage → IndexedDB
   - Delete the `momentum` database
   - In `indexeddb.service.ts`, temporarily change `CURRENT_INDEXEDDB_VERSION` to the target version (e.g., `1`)
   - Reload the app to create the database at that version

2. **Step through each migration:**
   - Change `CURRENT_INDEXEDDB_VERSION` to `2`, reload, verify stores/data
   - Change to `3`, reload, verify stores/data
   - Continue for each migration version

3. **Verify after each step:**
   - Check that expected stores exist
   - Check that data migrated correctly
   - Check that old stores are removed (if applicable)
   - Check console for migration errors

### Current Store Structure (v3)

| Store | Purpose | Example Keys |
|-------|---------|--------------|
| `persistent` | Long-term data (encryption keys) | `anonymous_key`, `user_abc123_key` |
| `settings` | User preferences | `anonymous_preferences_theme`, `user_abc123_preferences_language` |
| `backups` | Pre-migration data backups | `user_abc123_data_backup` |

### Migration v3 Checklist

- [ ] `keyval` store is deleted
- [ ] `persistent`, `settings`, `backups` stores exist
- [ ] Keys ending in `_key` moved to `persistent`
- [ ] Keys containing `preferences_` moved to `settings`
- [ ] Keys ending in `_data_backup` moved to `backups`

## Multi-Device Settings Sync

### Setup

1. Open the app in two browsers (e.g., Chrome and Firefox) or two browser profiles
2. Log in with the same account in both

### Test: Theme Sync

1. In Browser A: Change theme to "dark"
2. Verify: Browser B should update to dark theme within ~2 seconds (WebSocket push)
3. In Browser B: Change theme to "light"
4. Verify: Browser A should update to light theme

### Test: Language Sync

1. In Browser A: Change language to "Deutsch"
2. Verify: Browser B should update language
3. Check that UI text changes in both browsers

### Test: Conflict Resolution (Last-Write-Wins)

1. Disconnect Browser B from network (DevTools → Network → Offline)
2. In Browser A: Change theme to "dark"
3. In Browser B (offline): Change theme to "light"
4. Reconnect Browser B
5. Verify: The most recent change (by timestamp) wins in both browsers

### Test: Offline Resilience

1. Go offline (DevTools → Network → Offline)
2. Change theme - should save locally without errors
3. Verify: No Supabase token refresh errors in console
4. Go back online
5. Verify: Setting syncs to server

## Authentication Flows

### Test: Login with Return URL

1. While logged out, navigate to `/profile`
2. Should redirect to login
3. Log in successfully
4. Verify: Redirects back to `/profile`, not homepage

### Test: Session Persistence

1. Log in
2. Close browser completely
3. Reopen and navigate to app
4. Verify: Still logged in

### Test: Logout from Protected Route

1. Log in and navigate to `/profile`
2. Log out
3. Verify: Redirected to homepage (not stuck on protected route)

### Test: Storage Promotion on Login

1. While logged out, change theme to "dark"
2. Verify: Stored under `anonymous_` prefix in IndexedDB
3. Log in
4. Verify: Data promoted to `user_{id}_` prefix
5. Verify: Anonymous data cleared

## Offline/PWA Behavior

### Test: Offline Banner

1. Load the app while online
2. Go offline (physically disconnect or DevTools → Offline)
3. Verify: Offline banner appears after ~3 second grace period
4. Go back online
5. Verify: Banner disappears immediately

### Test: Service Worker Caching

1. Load the app while online
2. Go offline
3. Reload the page
4. Verify: App still loads from cache
5. Verify: Offline banner shows

### Test: No Error Spam When Offline

1. Log in while online
2. Go offline
3. Wait 30+ seconds
4. Verify: Console should NOT have repeated Supabase token refresh errors
5. Verify: Console shows "Auth: Auto-refresh paused (offline)"

## Data Management

### Test: Export User Data

1. Log in
2. Go to Profile → Export Data
3. Verify: JSON file downloads
4. Verify: File contains user data (settings, etc.)

### Test: Clear All Data

1. Log in and change some settings
2. Go to Profile → Clear All Data
3. Confirm the action
4. Verify: All IndexedDB stores cleared
5. Verify: Settings reset to defaults
6. Verify: Notifications cleared

### Test: Delete Account

1. Create a test account
2. Change some settings
3. Go to Profile → Delete Account
4. Confirm the action
5. Verify: Logged out and redirected
6. Verify: Cannot log in with deleted credentials

## Browser Compatibility

Test core functionality in:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Safari-Specific Checks

- [ ] IndexedDB operations work
- [ ] Service worker registers
- [ ] PWA install prompt appears (if applicable)

## Accessibility

### Keyboard Navigation

1. Tab through the entire app
2. Verify: All interactive elements are focusable
3. Verify: Focus order is logical
4. Verify: Focus indicators are visible

### Screen Reader

1. Use VoiceOver (Mac) or NVDA (Windows)
2. Navigate through main flows
3. Verify: All content is announced
4. Verify: Form labels are read correctly

## Performance

### Initial Load

1. Clear cache and hard reload
2. Check Network tab for:
   - [ ] Total transfer size < 500KB (gzipped)
   - [ ] Time to interactive < 3s on 3G

### Memory Leaks

1. Open DevTools → Memory
2. Take heap snapshot
3. Navigate around the app for 5 minutes
4. Take another heap snapshot
5. Compare: Memory should not grow unbounded
