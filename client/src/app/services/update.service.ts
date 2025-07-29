import { DestroyRef, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { interval } from 'rxjs';
import { ENVIRONMENT } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UpdateService {
  confirming = false;
  
  constructor(
    readonly updates: SwUpdate,
    readonly destroyRef: DestroyRef,
  ){}

  public checkForUpdates(): void {
    this.updates.versionUpdates.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      this.promptUser(event);
    });

    if(ENVIRONMENT.env === 'production'){
      interval(5 * 60 * 1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.updates.checkForUpdate().then(() => {
          /*keep this*/console.log('checked for updates');
        });
      });
    }

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
