import { Injectable } from '@angular/core';
import { INSTALLERS } from '@app/helpers/constants';
import { Installer } from '@app/models/data.model';

import packageJson from 'src/../package.json';

@Injectable({
  providedIn: 'root'
})
export class InstallersService {

  getInstallers(): Installer[] {
    return INSTALLERS.map(installer => {
      return {
        ...installer,
        url: installer.url.replace(/{version}/g, packageJson.version)
      }
    });
  }
  
}
