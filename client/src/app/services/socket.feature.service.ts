import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SocketIoService } from '@app/services/socket.io.service';
import { FeatureFlag } from '@app/models/data.model';

@Injectable({
  providedIn: 'root',
})
export class SocketFeatureService {
  constructor(private socketIoService: SocketIoService) {}

  // Subscribe to feature flag updates
  getFeatureFlags(): Observable<FeatureFlag[]> {
    return this.socketIoService.listen<FeatureFlag[]>('update-feature-flags');
  }

}
