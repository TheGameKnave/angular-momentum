import { Injectable } from '@angular/core';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { AutoUnsubscribe } from '@app/helpers/unsub';
import { interval } from 'rxjs';
import { ENVIRONMENT } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
@AutoUnsubscribe()
export class UpdateService {
  confirming: boolean = false;
  constructor(
    private updates: SwUpdate
  ){}

  public checkForUpdates(): void {
    this.updates.versionUpdates.subscribe(event => {
      this.promptUser(event);
    });

    const updateIntervalMinutes = ENVIRONMENT.env == 'production' ? 4 : 0.1;
    interval(updateIntervalMinutes * 60 * 1000).subscribe(() => {
      this.updates.checkForUpdate().then(() => {
        /*keep this*/console.log('checked for updates');
      });
    });

  }

  /* istanbul ignore next */
  public promptUser(event: VersionEvent): void {
    if(event.type == 'VERSION_READY' && !this.confirming) {
      this.confirming = true;
      if(confirm('A new version of this app is available. Please click “OK” to reload.')) {
        this.confirming = false;
        window.location.reload();
      }
    }else if(event.type == 'VERSION_DETECTED') {
      /*keep this*/console.log(event);
    }
  }
}
