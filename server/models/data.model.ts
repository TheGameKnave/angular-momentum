// Notification types
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: unknown;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: string;
  payload?: unknown;
}
