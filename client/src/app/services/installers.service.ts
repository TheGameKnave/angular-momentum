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
    if (userAgent.match(/Windows/i)) return 'Windows';
    if (userAgent.match(/Mac/i)) return 'Mac';
    if (userAgent.match(/Linux/i)) return 'Linux';
    if (userAgent.match(/Android/i)) return 'Android';
    if (userAgent.match(/iOS/i)) return 'iOS';
    return 'Unknown';
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
