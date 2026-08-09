import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { OverlayModule } from '@angular/cdk/overlay';
import { MessageDialogService } from '@app/services/message-dialog.service';
import { DIALOG_DEFAULT_LABELS } from '@app/constants/translations.constants';
import { DialogBaseComponent } from '../dialog-base.component';

/**
 * Generic message dialog component (errors, warnings, info).
 *
 * One-button counterpart to DialogConfirmComponent, rendered from
 * MessageDialogService state. Uses its own CDK overlay so it stacks above
 * menus and confirm dialogs with the standard opaque backdrop, and Escape
 * closes only this dialog (CDK dispatches keydown to the top-most overlay).
 */
@Component({
  selector: 'app-dialog-message',
  templateUrl: './dialog-message.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ButtonModule,
    OverlayModule,
  ],
})
export class DialogMessageComponent extends DialogBaseComponent {
  protected readonly dialogService = inject(MessageDialogService);

  /** Dialog visibility bound to service signal */
  readonly visible: Signal<boolean> = this.dialogService.visible;

  /** Current message options */
  readonly options = this.dialogService.options;

  /** Default button labels (exposed for template) */
  protected readonly defaultLabels = DIALOG_DEFAULT_LABELS;

  /** CSS class for overlay panel */
  protected readonly panelClass = 'dialog-message-overlay-panel';

  /**
   * Handle OK button click.
   */
  onOk(): void {
    this.dialogService.dismiss();
  }

  /**
   * Handle dismiss from base class (Escape key or backdrop click).
   */
  // istanbul ignore next - invoked by overlay dismiss handlers (integration test scope)
  protected onDismiss(): void {
    this.onOk();
  }
}
