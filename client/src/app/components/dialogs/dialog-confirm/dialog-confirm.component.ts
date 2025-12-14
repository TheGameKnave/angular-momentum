import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { OverlayModule } from '@angular/cdk/overlay';
import { ConfirmDialogService } from '@app/services/confirm-dialog.service';
import { DIALOG_DEFAULT_LABELS } from '@app/constants/translations.constants';
import { DialogBaseComponent, OverlayDismissConfig } from '../dialog-base.component';

/**
 * Generic confirmation dialog component.
 *
 * Renders a configurable confirmation dialog based on options from ConfirmDialogService.
 * Supports both simple messages and custom content templates.
 * Uses Angular CDK overlay for consistent dialog styling.
 */
@Component({
  selector: 'app-dialog-confirm',
  templateUrl: './dialog-confirm.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    TranslocoDirective,
    ButtonModule,
    MessageModule,
    OverlayModule,
  ],
})
export class DialogConfirmComponent extends DialogBaseComponent {
  protected readonly dialogService = inject(ConfirmDialogService);

  /** Dialog visibility bound to service signal */
  readonly visible: Signal<boolean> = this.dialogService.visible;

  /** Loading state */
  readonly loading = this.dialogService.loading;

  /** Error message */
  readonly error = this.dialogService.error;

  /** Current options */
  readonly options = this.dialogService.options;

  /** Default button labels (exposed for template) */
  protected readonly defaultLabels = DIALOG_DEFAULT_LABELS;

  /** CSS class for overlay panel */
  protected readonly panelClass = 'dialog-confirm-overlay-panel';

  /** Dismiss config - allow dismiss when not loading */
  // istanbul ignore next - canDismiss callback invoked by overlay dismiss handlers (integration test scope)
  protected override readonly dismissConfig: OverlayDismissConfig = {
    escapeKey: true,
    backdropClick: true,
    canDismiss: () => !this.loading(),
  };

  /**
   * Handle confirmation.
   */
  async onConfirm(): Promise<void> {
    await this.dialogService.confirm();
  }

  /**
   * Handle cancel/dismiss.
   */
  onCancel(): void {
    this.dialogService.dismiss();
  }

  /**
   * Handle dismiss from base class (Escape key or backdrop click).
   */
  // istanbul ignore next - invoked by overlay dismiss handlers (integration test scope)
  protected onDismiss(): void {
    this.onCancel();
  }
}
