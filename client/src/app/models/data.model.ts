import { Type } from "@angular/core";
import { ComponentName } from "@app/helpers/component-list";

// Non-component feature flags - add more arbitrary features here
export type ArbitraryFeatureName = 
  'App Version' | 
  'Environment' | 
  'Language';

export type ArbitraryFeatures = Record<ArbitraryFeatureName, boolean>;

export type ComponentFlags = Record<ComponentName, boolean>;

export type FeatureFlagResponse = ArbitraryFeatures & ComponentFlags;

export interface ApiResponse {
  data: unknown; // You can replace 'any' with a more specific type if you know what it is
}

export type ChangeImpact = 'patch' | 'minor' | 'major'; 

export interface ComponentInstance {
  name: string,
  component: Type<unknown>,
  icon: string,
}

export interface FeatureFlag {
  key: string;
  value: boolean;
}

export interface Installer {
  name: string;
  icon: string;
  url: string;
}

// Notification types
export interface Notification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  data?: unknown;
  timestamp: Date;
  read: boolean;
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: unknown;
  // Translation parameters (for parameterized messages)
  params?: Record<string, unknown>;
}

export interface SendNotificationResponse {
  data: {
    sendNotification: {
      success: boolean;
      message: string;
    };
  };
}

export interface PredefinedNotification {
  titleKey?: string; // Translation key for title (for server broadcasts)
  bodyKey?: string; // Translation key for body (for server broadcasts)
  title: string; // Translated title (for display and local notifications)
  body: string; // Translated body (for display and local notifications)
  icon: string;
  label: string;
  severity: 'success' | 'info' | 'warn' | 'secondary';
  // Translation parameters (for parameterized messages like timestamps)
  params?: Record<string, unknown>;
}

// Tauri notification plugin types
export type TauriPermission = 'granted' | 'denied' | 'default';

export interface TauriNotificationOptions {
  title: string;
  body?: string;
  icon?: string;
}