import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SocketIoService } from '@app/services/socket.io.service';
import { FeatureFlag } from '@app/models/data.model';

/**
 * Service for receiving feature flag updates via WebSocket.
 *
 * Provides an observable stream of feature flag updates pushed from the server.
 * Works in conjunction with FeatureFlagService for real-time synchronization.
 *
 * Features:
 * - WebSocket-based feature flag updates
 * - Real-time flag changes across all connected clients
 */
@Injectable({
  providedIn: 'root',
})
export class SocketFeatureService {
  readonly socketIoService = inject(SocketIoService);


  /**
   * Subscribe to feature flag updates via WebSocket.
   * Listens for 'update-feature-flags' events from the server.
   *
   * @returns Observable stream of feature flag arrays
   */
  getFeatureFlags(): Observable<FeatureFlag[]> {
    return this.socketIoService.listen<FeatureFlag[]>('update-feature-flags');
  }

}
