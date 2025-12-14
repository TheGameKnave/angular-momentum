# Server-Side Notification Translations Implementation Plan

## Overview
Move notification content translations from client i18n files to server, sending all language variants with each notification so clients can display in their locale without needing pre-configured translation keys.

## Architecture

### Current Flow
```
Server → { titleKey: "notification.Welcome!", bodyKey: "..." } → Client → Transloco lookup
```

### New Flow
```
Server → {
  title: { en: "Welcome!", de: "Willkommen!", ... },
  body: { en: "Thanks for...", de: "Danke...", ... },
  params: { time: "2025-12-05T22:00:00Z" }
} → Client → Pick by locale, ICU format params
```

## Implementation Steps

### Step 1: Create Server Notification Translations File
**File:** `server/data/notifications.ts`

Structure each notification with an ID and all language variants:
```typescript
export const NOTIFICATIONS = {
  welcome: {
    title: { en: "Welcome!", de: "Willkommen!", fr: "Bienvenue!", ... },
    body: { en: "Thanks for trying...", de: "Danke, dass Sie...", ... }
  },
  feature_update: { ... },
  maintenance: { ... },  // body contains {time} placeholder
  achievement: { ... }
} as const;
```

### Step 2: Create Schema for Validation
**File:** `server/data/notifications.schema.json`

JSON Schema to validate that all notifications have all required languages and proper structure.

### Step 3: Add Validation Test
**File:** `tests/translation/notification-validation.ts`

- Validate schema compliance
- Ensure all 6 languages present for each notification
- Validate ICU syntax in messages with parameters
- Add to CI workflow and test.sh

### Step 4: Update Server Notification Service
**File:** `server/services/notificationService.ts`

Add helper to build localized payloads:
```typescript
export function createLocalizedNotification(
  notificationId: keyof typeof NOTIFICATIONS,
  params?: Record<string, unknown>
): LocalizedNotificationPayload {
  const notification = NOTIFICATIONS[notificationId];
  return {
    title: notification.title,
    body: notification.body,
    params,
    icon: notification.icon
  };
}
```

### Step 5: Update Data Models
**File:** `server/models/data.model.ts`

Add new interface:
```typescript
interface LocalizedNotificationPayload {
  title: Record<string, string>;  // { en: "...", de: "...", ... }
  body: Record<string, string>;
  params?: Record<string, unknown>;
  icon?: string;
  tag?: string;
}
```

**File:** `client/src/app/models/data.model.ts`

Update client interface to handle localized payloads.

### Step 6: Update GraphQL Schema
**File:** `server/services/graphqlService.ts`

Update mutations to accept either:
- `notificationId` (server looks up translations)
- OR raw localized payload (for custom/dynamic notifications)

### Step 7: Update Client Notification Service
**File:** `client/src/app/services/notification.service.ts`

- `listenForWebSocketNotifications`: Pick correct language from payload based on `translocoService.getActiveLang()`
- Fall back to English if locale not available
- Use Transloco only for ICU parameter formatting (dates, plurals)
- No more titleKey/bodyKey lookups for server notifications

### Step 8: Update Notifications Page Component
**File:** `client/src/app/components/pages/notifications/notifications.component.ts`

Update `sendServerNotification` to send notification ID instead of translation keys.

### Step 9: Remove Migrated Keys from Client i18n
**Files:** `client/src/assets/i18n/*.json`

Remove notification content keys (keep UI keys):
- Keep: "Unread Count", "Mark all read", "Clear all", "No notifications", "Enable Notifications", "Delete notification"
- Remove: "Welcome!", "Thanks for trying...", "Welcome Message", "New Feature Available", etc.

### Step 10: Update Translation Schema
**File:** `tests/translation/translation.schema.json`

Remove migrated notification content keys from the schema.

### Step 11: Update Constants
**File:** `client/src/app/constants/translations.constants.ts`

Remove NOTIFICATION_MESSAGES constants (they'll be server-side IDs now).

## Files Changed Summary

### Server (New/Modified)
- `server/data/notifications.ts` (NEW)
- `server/data/notifications.schema.json` (NEW)
- `server/services/notificationService.ts` (MODIFIED)
- `server/services/graphqlService.ts` (MODIFIED)
- `server/models/data.model.ts` (MODIFIED)

### Client (Modified)
- `client/src/app/services/notification.service.ts`
- `client/src/app/components/pages/notifications/notifications.component.ts`
- `client/src/app/components/menus/notification-center/notification-center.component.ts`
- `client/src/app/models/data.model.ts`
- `client/src/app/constants/translations.constants.ts`
- `client/src/assets/i18n/*.json` (all 6 files)

### Tests (New/Modified)
- `tests/translation/notification-validation.ts` (NEW)
- `tests/translation/translation.schema.json` (MODIFIED)
- `.github/workflows/build_test.yml` (MODIFIED - add notification validation)
- `tests/test.sh` (MODIFIED - add notification validation)

## Testing
1. Server unit tests for notification service
2. Client unit tests for notification handling
3. Schema validation in CI
4. Manual test: send notifications, verify correct language displays
