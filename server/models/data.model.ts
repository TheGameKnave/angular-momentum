/**
 * Payload structure for push notifications sent to clients
 * @property title - Notification title text
 * @property body - Notification body/message text
 * @property icon - Optional icon URL to display with the notification
 * @property data - Optional additional data payload
 * @property tag - Optional tag to group or replace notifications
 * @property requireInteraction - Whether notification requires user interaction to dismiss
 * @property actions - Optional array of action buttons for the notification
 */
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: unknown;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
}

/**
 * Action button configuration for interactive notifications
 * @property label - Display text for the action button
 * @property action - Action identifier/type to execute
 * @property payload - Optional data payload associated with the action
 */
export interface NotificationAction {
  label: string;
  action: string;
  payload?: unknown;
}
