import { Directive, HostListener, inject } from '@angular/core';
import { DialogMenuComponent } from '@app/components/menus/dialog-menu/dialog-menu.component';

/**
 * Directive that closes the parent dialog menu when the host element is clicked.
 *
 * Use this on interactive elements (links, buttons) inside a dialog menu that should
 * close the menu after selection.
 *
 * Usage:
 * ```html
 * <app-dialog-menu>
 *   <button menu-trigger>Open</button>
 *   <div menu-content>
 *     <a href="#" appMenuClose>Option 1</a>
 *     <button appMenuClose>Option 2</button>
 *   </div>
 * </app-dialog-menu>
 * ```
 */
@Directive({
  selector: '[appMenuClose]',
})
export class MenuCloseDirective {
  private readonly dialogMenu = inject(DialogMenuComponent, { optional: true });

  @HostListener('click')
  onClick(): void {
    this.dialogMenu?.close();
  }

  @HostListener('keydown.enter')
  onEnter(): void {
    this.dialogMenu?.close();
  }
}
