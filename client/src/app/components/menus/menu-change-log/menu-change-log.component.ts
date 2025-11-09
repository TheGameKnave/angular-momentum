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

  closeMenu() {
    if (this.overlayRef?.hasAttached()) {
      this.overlayRef.detach();
    }
    this.showMenu.set(false);
  }

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

  linkMessage = computed(() => {
  return this.translate.translate(
    'If you encounter problems, you can use the webapp at {url} until an app update is ready.',
    { url: this.packageJson.siteUrl }
  ).replace(/>a/g,'<a').replace(/>\/a/g,'</a');
});
}
