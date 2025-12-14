import { Injectable, signal } from '@angular/core';

/**
 * Service for managing the update dialog.
 *
 * Provides a centralized way to show and handle the update dialog,
 * returning a Promise that resolves when the user makes a choice.
 */
@Injectable({ providedIn: 'root' })
export class UpdateDialogService {
  /** Signal to control dialog visibility */
  readonly visible = signal(false);

  /** Callback for when user confirms update */
  private resolvePromise: ((confirmed: boolean) => void) | null = null;

  /**
   * Show the update dialog and wait for user response.
   * @returns Promise that resolves to true if user confirms, false otherwise
   */
  show(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.visible.set(true);
    });
  }

  /**
   * Confirm the update (user clicked Update Now).
   */
  confirm(): void {
    this.visible.set(false);
    if (this.resolvePromise) {
      this.resolvePromise(true);
      this.resolvePromise = null;
    }
  }

  /**
   * Dismiss the dialog (user clicked Later - only for patches).
   */
  dismiss(): void {
    this.visible.set(false);
    if (this.resolvePromise) {
      this.resolvePromise(false);
      this.resolvePromise = null;
    }
  }
}
