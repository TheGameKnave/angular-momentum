import { ChangeDetectionStrategy, Component, computed, ViewChild, TemplateRef, ViewContainerRef, DestroyRef, signal, OnDestroy, ElementRef } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TranslocoHttpLoader } from '@app/services/transloco-loader.service';
import packageJson from 'src/../package.json';
import { isTauri } from '@tauri-apps/api/core';
import { ChangeImpact } from '@app/models/data.model';
import { ChangeLogService } from '@app/services/change-log.service';
import { CardModule } from 'primeng/card';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Menu changelog component that displays version information and update notifications.
 *
 * This component shows the current application version and provides a changelog overlay
 * when updates are available. It compares the installed version with the latest release
 * and displays semantic version difference messages. The component handles both Tauri
 * (native app) and web/PWA contexts differently.
 */
@Component({
  selector: 'app-menu-change-log',
  templateUrl: './menu-change-log.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    CardModule,
    OverlayModule,
  ],
})
export class MenuChangeLogComponent implements OnDestroy {
  @ViewChild('menuTemplate') menuTemplate!: TemplateRef<unknown>;
  @ViewChild('changeLogButton') changeLogButton!: ElementRef<HTMLElement>;

  isTauri = isTauri;
  changeLog = this.changeLogService;
  Object = Object;
  packageJson = packageJson;
  classToLang: Record<string, string> = {};
  showMenu = signal(false);
  private overlayRef: OverlayRef | null = null;

  constructor(
    public readonly translate: TranslocoService,
    public readonly translocoLoader: TranslocoHttpLoader,
    public readonly changeLogService: ChangeLogService,
    private readonly overlay: Overlay,
    private readonly viewContainerRef: ViewContainerRef,
    private readonly destroyRef: DestroyRef,
  ){
  }

  ngOnDestroy() {
    this.closeMenu();
  }

  toggleMenu() {
    if (this.showMenu()) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  /**
   * Opens the changelog overlay.
   * Creates the overlay if it doesn't exist, attaches the changelog template portal,
   * and sets up backdrop click handling to close the overlay.
   */
  private openMenu() {
    if (!this.overlayRef) {
      const positionStrategy = this.overlay.position().global();

      this.overlayRef = this.overlay.create({
        positionStrategy,
        hasBackdrop: true,
        backdropClass: 'app-overlay-backdrop',
        scrollStrategy: this.overlay.scrollStrategies.noop(),
        panelClass: 'menu-overlay-panel'
      });

      // Close on backdrop click
      /* istanbul ignore next - CDK Overlay integration */
      this.overlayRef.backdropClick().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.closeMenu();
      });
    }

    const portal = new TemplatePortal(this.menuTemplate, this.viewContainerRef);
    this.overlayRef.attach(portal);
    this.showMenu.set(true);
  }

  /**
   * Closes the changelog overlay.
   * Detaches the template portal from the overlay and updates the menu state.
   */
  closeMenu() {
    if (this.overlayRef?.hasAttached()) {
      this.overlayRef.detach();
    }
    this.showMenu.set(false);
  }

  /**
   * Computed signal that generates a localized message about version differences.
   * Determines whether the app is outdated by patches, minor versions, or major releases,
   * and generates an appropriate pluralized message based on the semantic version delta.
   * @returns A translated message indicating how many versions the app is behind
   */
  semverMessage = computed(() => {
    const typeMap: Record<ChangeImpact, { key: string; var: string }> = {
      patch: { key: '{patches} patch(es)', var: 'patches' },
      minor: { key: '{minors} minor version(s)', var: 'minors' },
      major: { key: '{majors} major release(s)', var: 'majors' }
    };
    const { key, var: pluralVar } = typeMap[this.changeLogService.appDiff().impact];
    const pluralValue = { [pluralVar]: this.changeLogService.appDiff().delta };

    // First: pluralize (e.g., "2 minor versions")
    const semver = this.translate.translate(key, pluralValue);

    // Then: insert into main sentence
    return this.translate.translate('This app is {semver} out of date.', { semver });
  });

  /**
   * Computed signal that generates a localized fallback message with webapp URL.
   * Provides users with the webapp URL as an alternative if they encounter problems
   * with the current app version. Performs string replacement to fix HTML tag formatting.
   * @returns A translated message with the webapp URL link
   */
  linkMessage = computed(() => {
  return this.translate.translate(
    'If you encounter problems, you can use the webapp at {url} until an app update is ready.',
    { url: this.packageJson.siteUrl }
  ).replace(/>a/g,'<a').replace(/>\/a/g,'</a');
});
}
