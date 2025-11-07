declare module '@tauri-apps/plugin-notification' {
  export interface TauriNotificationOptions {
    title: string;
    body?: string;
    icon?: string;
  }

  export type Permission = 'granted' | 'denied' | 'default';

  export function sendNotification(options: TauriNotificationOptions | string): Promise<void>;
  export function isPermissionGranted(): Promise<boolean>;
  export function requestPermission(): Promise<Permission>;
}
