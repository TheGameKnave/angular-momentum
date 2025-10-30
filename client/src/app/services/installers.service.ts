import { Injectable } from '@angular/core';
import { INSTALLERS } from '@app/helpers/constants';
import { Installer } from '@app/models/data.model';

import packageJson from 'src/../package.json';

@Injectable({
  providedIn: 'root'
})
export class InstallersService {

private determinePlatform(): string {
  const userAgent = window.navigator.userAgent;

  const platforms: { platform: string; regex: RegExp }[] = [
    { platform: 'Windows', regex: /Windows/i },
    { platform: 'Mac',     regex: /Mac/i },
    { platform: 'Linux',   regex: /Linux/i },
    { platform: 'Android', regex: /Android/i },
    { platform: 'iOS',     regex: /iOS/i },
  ];

  return platforms.find(p => p.regex.test(userAgent))?.platform ?? 'Unknown';
}

  private getInstallers(): Installer[] {
    return INSTALLERS.map(installer => {
      return {
        ...installer,
        url: installer.url.replace(/{version}/g, packageJson.version)
      }
    });
  }
  
  public getCurrentPlatformInstaller(): Installer {
    const platform = this.determinePlatform();
    return this.getInstallers().find(installer => installer.name === platform)!;
  }

  public getOtherInstallers(): Installer[] {
    return this.getInstallers().filter(installer => installer.name !== this.determinePlatform());
  }
}
