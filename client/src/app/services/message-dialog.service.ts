import { Injectable, signal } from '@angular/core';

/**
 * Severity of a message dialog. Drives the default title, icon, and color.
 */
export type MessageDialogSeverity = 'error' | 'warn' | 'info';

/**
 * Configuration options for a message dialog.
 */
export interface MessageDialogOptions {
  /** Message content (translation key) */
  message: string;
  /** Severity — picks default title/icon/color. Defaults to 'info' */
  severity?: MessageDialogSeverity;
  /** Dialog title (translation key). Defaults per severity */
  title?: string;
  /** Icon class. Defaults per severity */
  icon?: string;
  /** Icon color. Defaults per severity */
  iconColor?: string;
  /** Button label (translation key). Defaults to 'OK' */
  buttonLabel?: string;
  /** Callback invoked when this message is dismissed */
  onClose?: () => void;
}

/** Options with severity defaults applied — what the dialog renders from */
export type ResolvedMessageDialogOptions = MessageDialogOptions &
  Required<Pick<MessageDialogOptions, 'severity' | 'title' | 'icon' | 'iconColor'>>;

/** Per-severity defaults (titles are top-level translation keys) */
const SEVERITY_DEFAULTS: Record<MessageDialogSeverity, { title: string; icon: string; iconColor: string }> = {
  error: { title: 'Error', icon: 'pi pi-times-circle', iconColor: 'var(--p-red-500)' },
  warn: { title: 'Warning', icon: 'pi pi-exclamation-triangle', iconColor: 'var(--p-orange-500)' },
  info: { title: 'Information', icon: 'pi pi-info-circle', iconColor: 'var(--p-blue-500)' },
};

/**
 * Generic message dialog service for errors, warnings, and info.
 *
 * One-button ("OK") counterpart to ConfirmDialogService, rendered by
 * DialogMessageComponent in its own CDK overlay — so a message stacks
 * above menus and confirm dialogs, shares the standard opaque backdrop,
 * and Escape closes only this dialog (CDK dispatches keydown to the
 * top-most overlay only).
 *
 * Messages shown while one is already visible queue up and display in
 * order as each is dismissed.
 *
 * @example
 * ```typescript
 * // Pass translation keys — the key-usage check scans these, so examples
 * // reference real keys
 * messageDialog.showError('error.Verification failed');
 * messageDialog.showInfo('migration.Your data has been updated to a new format.');
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class MessageDialogService {
  /** Whether the dialog is visible */
  readonly visible = signal(false);

  /** Currently displayed message (with severity defaults applied) */
  readonly options = signal<ResolvedMessageDialogOptions | null>(null);

  /** Messages waiting behind the currently displayed one */
  private readonly queue: ResolvedMessageDialogOptions[] = [];

  /**
   * Show a message dialog. If one is already visible, the message is
   * queued and displayed when the current one is dismissed.
   */
  show(options: MessageDialogOptions): void {
    const severity = options.severity ?? 'info';
    const defaults = SEVERITY_DEFAULTS[severity];
    const resolved: ResolvedMessageDialogOptions = {
      ...options,
      severity,
      title: options.title ?? defaults.title,
      icon: options.icon ?? defaults.icon,
      iconColor: options.iconColor ?? defaults.iconColor,
    };

    if (this.visible()) {
      this.queue.push(resolved);
      return;
    }

    this.options.set(resolved);
    this.visible.set(true);
  }

  /**
   * Show an error message dialog.
   */
  showError(message: string, overrides?: Omit<MessageDialogOptions, 'message' | 'severity'>): void {
    this.show({ ...overrides, message, severity: 'error' });
  }

  /**
   * Show a warning message dialog.
   */
  showWarning(message: string, overrides?: Omit<MessageDialogOptions, 'message' | 'severity'>): void {
    this.show({ ...overrides, message, severity: 'warn' });
  }

  /**
   * Show an info message dialog.
   */
  showInfo(message: string, overrides?: Omit<MessageDialogOptions, 'message' | 'severity'>): void {
    this.show({ ...overrides, message, severity: 'info' });
  }

  /**
   * Dismiss the current message (OK, Escape, or backdrop click).
   * Displays the next queued message if there is one, and fires the
   * dismissed message's `onClose` callback.
   */
  dismiss(): void {
    const dismissed = this.options();

    const next = this.queue.shift();
    if (next) {
      this.options.set(next);
    } else {
      this.visible.set(false);
      this.options.set(null);
    }

    dismissed?.onClose?.();
  }
}
