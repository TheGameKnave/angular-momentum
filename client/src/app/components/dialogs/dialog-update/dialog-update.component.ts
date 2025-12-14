import { ChangeDetectionStrategy, Component, inject, computed, Signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { AccordionModule } from 'primeng/accordion';
import { OverlayModule } from '@angular/cdk/overlay';
import { ChangeLogService, ChangeLogResponse } from '@app/services/change-log.service';
import { UpdateDialogService } from '@app/services/update-dialog.service';
import { ScrollIndicatorDirective } from '@app/directives/scroll-indicator.directive';
import { DialogBaseComponent, OverlayDismissConfig } from '../dialog-base.component';

/**
 * Dialog component for application updates.
 *
 * Shows when the service worker detects a new version is available.
 * Handles only app version updates - data migrations are handled separately
 * by the DialogMigrationComponent.
 *
 * Behavior:
 * - Major/Minor updates: User must update (no dismiss option)
 * - Patch updates: User can choose to update later
 */
@Component({
  selector: 'app-dialog-update',
  templateUrl: './dialog-update.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ButtonModule,
    AccordionModule,
    OverlayModule,
    ScrollIndicatorDirective,
  ],
})
export class DialogUpdateComponent extends DialogBaseComponent {
  protected readonly changeLogService = inject(ChangeLogService);
  protected readonly updateDialogService = inject(UpdateDialogService);

  /** Dialog visibility from service */
  readonly visible: Signal<boolean> = this.updateDialogService.visible;

  /** Version diff info */
  readonly appDiff = this.changeLogService.appDiff;

  /** Latest available version */
  readonly latestVersion = this.changeLogService.appVersion;

  /** Current version */
  readonly currentVersion = computed(() => this.changeLogService.getCurrentVersion());

  /** Whether this is a required update (major/minor) */
  readonly isRequiredUpdate = computed(() => {
    const impact = this.appDiff().impact;
    return impact === 'major' || impact === 'minor';
  });

  /** All changelog entries between current version and latest version */
  readonly changelogEntries = computed((): ChangeLogResponse[] => {
    const changes = this.changeLogService.changes();
    const currentVersion = this.currentVersion();

    // Find all entries newer than current version
    const newerEntries: ChangeLogResponse[] = [];
    for (const entry of changes) {
      if (this.isVersionNewer(entry.version, currentVersion)) {
        newerEntries.push(entry);
      } else {
        break; // changelog is sorted newest first, so we can stop
      }
    }
    return newerEntries;
  });

  /** CSS class for overlay panel */
  protected readonly panelClass = 'dialog-update-overlay-panel';

  /** Dismiss config - only allow dismiss for patch updates */
  // istanbul ignore next - canDismiss callback invoked by overlay dismiss handlers (integration test scope)
  protected override readonly dismissConfig: OverlayDismissConfig = {
    escapeKey: true,
    backdropClick: true,
    canDismiss: () => !this.isRequiredUpdate(),
  };

  /**
   * Compare two semver versions.
   * @returns true if version1 is newer than version2
   */
  private isVersionNewer(version1: string, version2: string): boolean {
    const v1 = version1.split('.').map(Number);
    const v2 = version2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if ((v1[i] || 0) > (v2[i] || 0)) return true;
      if ((v1[i] || 0) < (v2[i] || 0)) return false;
    }
    return false; // equal
  }

  /**
   * Hide the dialog (only for patch updates).
   */
  onLater(): void {
    if (!this.isRequiredUpdate()) {
      this.updateDialogService.dismiss();
    }
  }

  /**
   * Proceed with update (confirms and triggers page reload).
   */
  onUpdate(): void {
    this.updateDialogService.confirm();
  }

  /**
   * Handle dismiss from base class (Escape key or backdrop click).
   */
  // istanbul ignore next - invoked by overlay dismiss handlers (integration test scope)
  protected onDismiss(): void {
    this.onLater();
  }
}
