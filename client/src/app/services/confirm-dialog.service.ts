import { Injectable, signal, TemplateRef } from '@angular/core';

/**
 * Configuration options for the confirm dialog.
 */
export interface ConfirmDialogOptions {
  /** Dialog title (translation key) */
  title: string;
  /** Simple message content (translation key). Use contentTemplate for complex content. */
  message?: string;
  /** Custom content template for complex dialog bodies */
  contentTemplate?: TemplateRef<unknown>;
  /** Icon class (e.g., 'pi pi-exclamation-triangle') */
  icon?: string;
  /** Icon color class (e.g., 'text-red-500', 'text-orange-500') */
  iconColor?: string;
  /** Confirm button label (translation key). Defaults to 'OK' */
  confirmLabel?: string;
  /** Confirm button icon (e.g., 'pi pi-trash') */
  confirmIcon?: string;
  /** Confirm button severity. Defaults to 'primary' */
  confirmSeverity?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger';
  /** Cancel button label (translation key). Defaults to 'Cancel' */
  cancelLabel?: string;
  /** Callback executed when user confirms */
  onConfirm: () => Promise<void>;
}

/**
 * Generic confirmation dialog service.
 *
 * Provides a single reusable confirmation dialog that can be configured
 * for different use cases (delete account, clear data, etc.).
 */
@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  /** Whether the dialog is visible */
  readonly visible = signal(false);

  /** Whether the confirm operation is in progress */
  readonly loading = signal(false);

  /** Error message to display (if any) */
  readonly error = signal<string | null>(null);

  /** Current dialog options */
  readonly options = signal<ConfirmDialogOptions | null>(null);

  /**
   * Show the confirmation dialog with the given options.
   */
  show(options: ConfirmDialogOptions): void {
    this.options.set(options);
    this.error.set(null);
    this.visible.set(true);
  }

  /**
   * Handle user confirmation.
   * Executes the confirm callback and closes dialog on success.
   */
  async confirm(): Promise<void> {
    const opts = this.options();
    if (!opts?.onConfirm) return;

    this.loading.set(true);
    this.error.set(null);
    try {
      await opts.onConfirm();
      this.visible.set(false);
      this.options.set(null);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Handle user dismissal (cancel).
   */
  dismiss(): void {
    this.visible.set(false);
    this.error.set(null);
    this.options.set(null);
  }
}
