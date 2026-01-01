import { Injectable, inject, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Socket } from 'ngx-socket-io';
import { Observable, EMPTY } from 'rxjs';
import { ConnectivityService } from './connectivity.service';

/**
 * Service for WebSocket communication using Socket.IO.
 *
 * Provides a simplified interface for WebSocket operations including
 * listening to events, emitting events, and managing connections.
 * Wraps the ngx-socket-io Socket for easier testing and usage.
 *
 * During SSR, the socket is not available and all operations are no-ops.
 *
 * Automatically disconnects when offline and reconnects when online
 * to prevent unnecessary reconnection attempts flooding the console.
 */
@Injectable({
  providedIn: 'root',
})
export class SocketIoService {
  readonly socket = inject(Socket, { optional: true }); // Optional for SSR
  private readonly connectivity = inject(ConnectivityService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  constructor() {
    // Auto-manage socket connection based on connectivity
    // istanbul ignore next - effect runs in browser only
    if (this.isBrowser && this.socket) {
      effect(() => {
        if (this.connectivity.isOnline()) {
          this.socket?.connect();
        } else {
          this.socket?.disconnect();
        }
      });
    }
  }

  /**
   * Listen to a WebSocket event.
   *
   * @param event - The event name to listen for
   * @returns Observable that emits when the event is received (EMPTY during SSR)
   */
  listen<T>(event: string): Observable<T> {
    // istanbul ignore next - SSR guard, socket is null during server rendering
    if (!this.socket) return EMPTY;
    return this.socket.fromEvent(event);
  }

  /**
   * Emit a WebSocket event to the server.
   * No-op during SSR.
   *
   * @param event - The event name to emit
   * @param payload - Optional data payload to send with the event
   */
  emit<T>(event: string, payload?: T): void {
    this.socket?.emit(event, payload);
  }

  /**
   * Disconnect the WebSocket connection.
   * No-op during SSR.
   *
   * Side effects:
   * - Closes the active WebSocket connection
   */
  disconnect(): void {
    this.socket?.disconnect();
  }

  /**
   * Reconnect the WebSocket connection.
   * No-op during SSR.
   *
   * Side effects:
   * - Establishes a new WebSocket connection
   */
  connect(): void {
    this.socket?.connect();
  }
}
