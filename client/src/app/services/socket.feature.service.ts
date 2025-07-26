import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SocketIoService } from '@app/services/socket.io.service';
import { FeatureFlag } from '@app/models/data.model';

@Injectable({
  providedIn: 'root',
})
export class SocketFeatureService {
  private socketIoService = inject(SocketIoService);


  // Subscribe to feature flag updates
  getFeatureFlags(): Observable<FeatureFlag[]> {
    return this.socketIoService.listen<FeatureFlag[]>('update-feature-flags');
  }

}
