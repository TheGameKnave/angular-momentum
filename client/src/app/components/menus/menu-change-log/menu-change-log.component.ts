import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TranslocoHttpLoader } from '@app/services/transloco-loader.service';
import packageJson from 'src/../package.json';
import { isTauri } from '@tauri-apps/api/core';
import { ChangeImpact } from '@app/models/data.model';
import { ChangeLogService } from '@app/services/change-log.service';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-menu-change-log',
  templateUrl: './menu-change-log.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    CardModule,
  ],
})
export class MenuChangeLogComponent {
  isTauri = isTauri;
  changeLog = this.changeLogService;

  Object = Object;
  packageJson = packageJson;
  classToLang: Record<string, string> = {};

  constructor(
    public readonly translate: TranslocoService,
    public readonly translocoLoader: TranslocoHttpLoader,
    public readonly changeLogService: ChangeLogService,
  ){
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

  stopEventPropagation(event: Event): void {
    event.stopPropagation();
  }
}
