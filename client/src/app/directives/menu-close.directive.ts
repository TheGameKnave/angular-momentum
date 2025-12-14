import { Directive, HostListener, inject } from '@angular/core';
import { AnchorMenuComponent } from '@app/components/menus/anchor-menu/anchor-menu.component';

/**
 * Directive that closes the parent anchor menu when the host element is clicked.
 *
 * Use this on interactive elements (links, buttons) inside an anchor menu that should
 * close the menu after selection.
 *
 * Usage:
 * ```html
 * <app-anchor-menu>
 *   <button menu-trigger>Open</button>
 *   <div menu-content>
 *     <a href="#" appMenuClose>Option 1</a>
 *     <button appMenuClose>Option 2</button>
 *   </div>
 * </app-anchor-menu>
 * ```
 */
@Directive({
  selector: '[appMenuClose]',
})
export class MenuCloseDirective {
  private readonly anchorMenu = inject(AnchorMenuComponent, { optional: true });

  @HostListener('click')
  onClick(): void {
    this.anchorMenu?.close();
  }

  @HostListener('keydown.enter')
  onEnter(): void {
    this.anchorMenu?.close();
  }
}
