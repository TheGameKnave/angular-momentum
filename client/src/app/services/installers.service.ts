import { computed, Injectable, Signal } from '@angular/core';
import { INSTALLERS, PLATFORMS } from '@app/helpers/constants';
import { Installer } from '@app/models/data.model';
import { ChangeLogService } from './change-log.service';

@Injectable({
  providedIn: 'root'
})
export class InstallersService {

  constructor(
    private readonly changeLogService: ChangeLogService,
  ) { }

  private determinePlatform(): string {
    const userAgent = window.navigator.userAgent;

    return PLATFORMS.find(p => p.regex.test(userAgent))?.platform ?? 'Unknown';
  }

  private readonly installers = computed(() => {
    const version = this.changeLogService.appVersion();
    return INSTALLERS.map(installer => ({
      ...installer,
      url: installer.url.replace(/{version}/g, version),
    }));
  });
  
  public readonly currentPlatformInstaller: Signal<Installer> = computed(() => {
    const platform = this.determinePlatform();
    return this.installers().find(i => i.name === platform)!;
  });

  public readonly otherInstallers: Signal<Installer[]> = computed(() => {
    const platform = this.determinePlatform();
    return this.installers().filter(i => i.name !== platform);
  });

  public getCurrentPlatformInstaller(): Installer {
    return this.currentPlatformInstaller();
  }

  public getOtherInstallers(): Installer[] {
    return this.otherInstallers();
  }
}
