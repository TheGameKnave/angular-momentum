import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';

/**
 * Service for WebSocket communication using Socket.IO.
 *
 * Provides a simplified interface for WebSocket operations including
 * listening to events, emitting events, and managing connections.
 * Wraps the ngx-socket-io Socket for easier testing and usage.
 */
@Injectable({
  providedIn: 'root',
})
export class SocketIoService {
  constructor(
    readonly socket: Socket,
  ) {}

  /**
   * Listen to a WebSocket event.
   *
   * @param event - The event name to listen for
   * @returns Observable that emits when the event is received
   */
  listen<T>(event: string): Observable<T> {
    return this.socket.fromEvent(event);
  }

  /**
   * Emit a WebSocket event to the server.
   *
   * @param event - The event name to emit
   * @param payload - Optional data payload to send with the event
   */
  emit<T>(event: string, payload?: T): void {
    this.socket.emit(event, payload);
  }

  /**
   * Disconnect the WebSocket connection.
   *
   * Side effects:
   * - Closes the active WebSocket connection
   */
  disconnect(): void {
    this.socket.disconnect();
  }

  /**
   * Reconnect the WebSocket connection.
   *
   * Side effects:
   * - Establishes a new WebSocket connection
   */
  connect(): void {
    this.socket.connect();
  }
}
