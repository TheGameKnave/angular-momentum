import { Component, DestroyRef, ViewContainerRef, TemplateRef, ViewChild, signal, input, output } from '@angular/core';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { OVERLAY_CONFIG } from '@app/constants/ui.constants';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Reusable anchor menu component that provides consistent overlay behavior.
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
 * <app-anchor-menu width="40rem">
 *   <button menu-trigger>Open Modal</button>
 *   <div menu-content>Centered content</div>
 * </app-anchor-menu>
 *
 * <!-- Right edge (notifications, auth) -->
 * <app-anchor-menu position="top-right" width="38rem">
 *   <button menu-trigger>Notifications</button>
 *   <div menu-content>Notification list</div>
 * </app-anchor-menu>
 *
 * <!-- Left edge (changelog) -->
 * <app-anchor-menu position="left" width="42rem">
 *   <button menu-trigger>Changelog</button>
 *   <div menu-content>Version history</div>
 * </app-anchor-menu>
 *
 * <!-- Bottom drawer -->
 * <app-anchor-menu position="bottom">
 *   <button menu-trigger>Open Drawer</button>
 *   <div menu-content>Drawer content</div>
 * </app-anchor-menu>
 * ```
 */
@Component({
  selector: 'app-anchor-menu',
  templateUrl: './anchor-menu.component.html',
  imports: [
    OverlayModule,
    NgClass,
  ],
})
export class AnchorMenuComponent {
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

  constructor(
    private readonly overlay: Overlay,
    private readonly viewContainerRef: ViewContainerRef,
    private readonly destroyRef: DestroyRef,
    private readonly translocoService: TranslocoService,
  ) {
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
        scrollStrategy: this.overlay.scrollStrategies.block(),
        panelClass: 'anchor-menu-overlay-panel'
      });

      // Close on backdrop click
      // istanbul ignore next - integration tests are out of scope
      this.overlayRef.backdropClick().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.close();
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
