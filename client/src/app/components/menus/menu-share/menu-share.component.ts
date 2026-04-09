import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DialogMenuComponent } from '../dialog-menu/dialog-menu.component';
import { ShareButton } from 'ngx-sharebuttons/button';
import { QRCodeComponent } from 'angularx-qrcode';
import { TranslocoDirective } from '@jsverse/transloco';
import { Tooltip } from 'primeng/tooltip';
import { SCREEN_SIZES, TOOLTIP_CONFIG } from '@app/constants/ui.constants';

@Component({
  selector: 'app-menu-share',
  standalone: true,
  imports: [
    DialogMenuComponent,
    ShareButton,
    QRCodeComponent,
    TranslocoDirective,
    Tooltip,
  ],
  templateUrl: './menu-share.component.html',
})
/**
 * Share menu component for sharing the current page via social platforms, QR code, or native OS share sheet.
 * Uses the shared DialogMenuComponent for overlay behavior.
 */
export class MenuShareComponent {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  // istanbul ignore next - SSR fallback
  window: Window | undefined = globalThis.window;
  SCREEN_SIZES = SCREEN_SIZES;
  tooltipShowDelay = TOOLTIP_CONFIG.SHOW_DELAY;
  tooltipHideDelay = TOOLTIP_CONFIG.HIDE_DELAY;

  readonly isBrowser = isPlatformBrowser(this.platformId);
  readonly currentUrl = signal('');
  readonly pageTitle = signal('');

  readonly canNativeShare = this.isBrowser && !!navigator.share;

  readonly shareButtons = [
    { type: 'copy', label: 'Copy link' },
    { type: 'email', label: 'Email' },
    { type: 'facebook', label: 'Facebook' },
    { type: 'x', label: 'X' },
    { type: 'reddit', label: 'Reddit' },
    { type: 'pinterest', label: 'Pinterest' },
    { type: 'whatsapp', label: 'WhatsApp' },
    { type: 'telegram', label: 'Telegram' },
    { type: 'messenger', label: 'Messenger' },
    { type: 'tumblr', label: 'Tumblr' },
    { type: 'viber', label: 'Viber' },
    { type: 'line', label: 'Line' },
  ] as const;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.currentUrl.set(globalThis.location.href);
      this.pageTitle.set(document.title);
    }

    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd && isPlatformBrowser(this.platformId)) {
        this.currentUrl.set(globalThis.location.href);
        this.pageTitle.set(document.title);
      }
    });
  }

  /**
   * Triggers the native OS share dialog with the current page URL and title.
   */
  nativeShare(): void {
    navigator.share({
      title: this.pageTitle(),
      url: this.currentUrl(),
    }).catch(() => { /* user cancelled share dialog */ });
  }

  /**
   * Downloads the QR code canvas as a PNG image.
   */
  downloadQrCode(): void {
    const canvas = document.querySelector('app-menu-share qrcode canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'qr-code.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
}
