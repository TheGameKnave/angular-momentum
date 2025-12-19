import { Component, DestroyRef, ViewContainerRef, TemplateRef, ViewChild, signal, input, output, inject } from '@angular/core';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { OVERLAY_CONFIG } from '@app/constants/ui.constants';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Reusable dialog menu component that provides consistent overlay behavior.
 *
 * Features:
 * - Flexible positioning (edges, corners, or centered modal)
 * - Configurable width
 * - Content projection for trigger button and menu content
 * - Backdrop handling
 * - Consistent styling
 *
 * Position Options:
 * - Empty ('') - Centered modal (default)
 * - Single edge: 'left', 'right', 'top', 'bottom' - Full height/width along edge
 * - Corners: 'top-right', 'top-left', 'bottom-right', 'bottom-left' - Anchored to corner
 *
 * Usage:
 * ```html
 * <!-- Centered modal -->
 * <app-dialog-menu width="40rem">
 *   <button menu-trigger>Open Modal</button>
 *   <div menu-content>Centered content</div>
 * </app-dialog-menu>
 *
 * <!-- Right edge (notifications, auth) -->
 * <app-dialog-menu position="top-right" width="38rem">
 *   <button menu-trigger>Notifications</button>
 *   <div menu-content>Notification list</div>
 * </app-dialog-menu>
 *
 * <!-- Left edge (changelog) -->
 * <app-dialog-menu position="left" width="42rem">
 *   <button menu-trigger>Changelog</button>
 *   <div menu-content>Version history</div>
 * </app-dialog-menu>
 *
 * <!-- Bottom drawer -->
 * <app-dialog-menu position="bottom">
 *   <button menu-trigger>Open Drawer</button>
 *   <div menu-content>Drawer content</div>
 * </app-dialog-menu>
 * ```
 */
@Component({
  selector: 'app-dialog-menu',
  templateUrl: './dialog-menu.component.html',
  imports: [
    OverlayModule,
    NgClass,
  ],
})
export class DialogMenuComponent {
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translocoService = inject(TranslocoService);

  @ViewChild('menuTemplate') menuTemplate!: TemplateRef<unknown>;

  /**
   * Position of the menu relative to the viewport.
   * Accepts any combination of edge keywords:
   * - Single: 'left', 'right', 'top', 'bottom'
   * - Combined: 'top-right', 'top-left', 'bottom-right', 'bottom-left'
   * - Empty/undefined: Centered modal (default)
   */
  position = input<'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | ''>('');

  /**
   * Width of the menu panel.
   */
  width = input<string>('auto');

  /**
   * Z-index for the overlay.
   */
  zIndex = input<number>(OVERLAY_CONFIG.DEFAULT_Z_INDEX);

  /**
   * Whether to show the close button in the menu panel.
   */
  showCloseButton = input<boolean>(true);

  /**
   * Whether the menu is currently open.
   */
  isOpen = signal(false);

  /**
   * Emitted when the menu is closed.
   */
  readonly closed = output<void>();

  /**
   * Translated aria-label for open menu button.
   */
  readonly ariaLabelOpen = signal('');

  /**
   * Translated aria-label for close menu button.
   */
  readonly ariaLabelClose = signal('');

  private overlayRef: OverlayRef | null = null;

  constructor() {
    // Initialize translated aria labels
    this.ariaLabelOpen.set(this.translocoService.translate('a11y.Open menu'));
    this.ariaLabelClose.set(this.translocoService.translate('a11y.Close menu'));
  }

  /**
   * Toggle menu open/closed.
   */
  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open the menu.
   */
  open(): void {
    if (!this.overlayRef) {
      const positionStrategy = this.overlay.position().global();

      this.overlayRef = this.overlay.create({
        positionStrategy,
        hasBackdrop: true,
        backdropClass: 'app-overlay-backdrop',
        scrollStrategy: this.overlay.scrollStrategies.noop(),
        panelClass: 'dialog-menu-overlay-panel'
      });

      // Close on backdrop click
      // istanbul ignore next - integration tests are out of scope
      this.overlayRef.backdropClick().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.close();
      });

      // Close on Escape key
      // istanbul ignore next - integration tests are out of scope
      this.overlayRef.keydownEvents().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
        if (event.key === 'Escape') {
          this.close();
        }
      });
    }

    const portal = new TemplatePortal(
      this.menuTemplate,
      this.viewContainerRef
    );
    this.overlayRef.attach(portal);
    this.isOpen.set(true);
  }

  /**
   * Close the menu.
   */
  close(): void {
    if (this.overlayRef?.hasAttached()) {
      this.overlayRef.detach();
    }
    this.isOpen.set(false);
    this.closed.emit();
  }
}
