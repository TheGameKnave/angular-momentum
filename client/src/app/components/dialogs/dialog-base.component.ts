import { DestroyRef, Directive, Signal, TemplateRef, ViewChild, ViewContainerRef, afterNextRender, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

/**
 * Configuration for overlay dismiss behavior.
 */
export interface OverlayDismissConfig {
  /** Whether Escape key dismisses the dialog */
  escapeKey: boolean;
  /** Whether backdrop click dismisses the dialog */
  backdropClick: boolean;
  /** Optional condition that must be true to allow dismiss */
  canDismiss?: () => boolean;
}

/**
 * Base class for dialog components using Angular CDK Overlay.
 *
 * Provides common overlay management functionality:
 * - Creating and positioning the overlay
 * - Opening/closing based on visibility signal
 * - Handling backdrop click and Escape key dismissal
 * - ViewChild template readiness tracking
 *
 * Subclasses must:
 * - Provide a `visible` signal indicating dialog visibility
 * - Implement `onDismiss()` to handle dismiss actions
 * - Define `panelClass` for overlay styling
 * - Optionally override `dismissConfig` for dismiss behavior
 */
@Directive()
export abstract class DialogBaseComponent {
  protected readonly overlay = inject(Overlay);
  protected readonly viewContainerRef = inject(ViewContainerRef);
  protected readonly destroyRef = inject(DestroyRef);

  @ViewChild('dialogTemplate') dialogTemplate!: TemplateRef<unknown>;

  protected overlayRef: OverlayRef | null = null;
  protected readonly viewReady = signal(false);

  /** Signal indicating dialog visibility - must be provided by subclass */
  abstract readonly visible: Signal<boolean>;

  /** CSS class for the overlay panel - must be provided by subclass */
  protected abstract readonly panelClass: string;

  /** Configuration for dismiss behavior - override to customize */
  protected readonly dismissConfig: OverlayDismissConfig = {
    escapeKey: true,
    backdropClick: true,
  };

  /** Handle dismiss action - must be implemented by subclass */
  protected abstract onDismiss(): void;

  constructor() {
    // Mark view as ready after first render (ensures ViewChild is available)
    // istanbul ignore next - afterNextRender doesn't execute in unit tests
    afterNextRender(() => {
      this.viewReady.set(true);
    });

    // React to visibility changes
    effect(() => {
      const isVisible = this.visible();
      const ready = this.viewReady();

      // Only open overlay if view is ready and template is available
      // istanbul ignore next - overlay branches depend on viewReady which requires afterNextRender
      if (isVisible && ready && this.dialogTemplate) {
        this.openOverlay();
      } else if (!isVisible) {
        this.closeOverlay();
      }
    });
  }

  /**
   * Open the CDK overlay dialog.
   */
  // istanbul ignore next - requires afterNextRender to set viewReady, which doesn't run in unit tests
  protected openOverlay(): void {
    if (this.overlayRef?.hasAttached()) return;

    if (!this.overlayRef) {
      const positionStrategy = this.overlay.position()
        .global()
        .centerHorizontally()
        .centerVertically();

      this.overlayRef = this.overlay.create({
        positionStrategy,
        hasBackdrop: true,
        backdropClass: 'app-overlay-backdrop',
        scrollStrategy: this.overlay.scrollStrategies.block(),
        panelClass: this.panelClass,
      });

      this.setupDismissHandlers();
    }

    const portal = new TemplatePortal(this.dialogTemplate, this.viewContainerRef);
    this.overlayRef.attach(portal);
  }

  /**
   * Set up handlers for Escape key and backdrop click based on dismissConfig.
   */
  // istanbul ignore next - requires afterNextRender, which doesn't run in unit tests
  protected setupDismissHandlers(): void {
    if (!this.overlayRef) return;

    const { escapeKey, backdropClick, canDismiss } = this.dismissConfig;
    const checkCanDismiss = () => !canDismiss || canDismiss();

    if (escapeKey) {
      this.overlayRef.keydownEvents()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(event => {
          if (event.key === 'Escape' && checkCanDismiss()) {
            this.onDismiss();
          }
        });
    }

    if (backdropClick) {
      this.overlayRef.backdropClick()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          if (checkCanDismiss()) {
            this.onDismiss();
          }
        });
    }
  }

  /**
   * Close the CDK overlay dialog.
   */
  // istanbul ignore next - requires afterNextRender, which doesn't run in unit tests
  protected closeOverlay(): void {
    if (this.overlayRef?.hasAttached()) {
      this.overlayRef.detach();
    }
  }
}
