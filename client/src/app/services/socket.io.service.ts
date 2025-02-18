import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocketIoService {
  constructor(private socket: Socket) {}

  // Listen to an event
  listen<T>(event: string): Observable<T> {
    return this.socket.fromEvent(event) as Observable<T>;
  }

  // Emit an event
  emit<T>(event: string, payload?: T): void {
    this.socket.emit(event, payload);
  }

  // Disconnect the socket
  disconnect(): void {
    this.socket.disconnect();
  }

  // Reconnect the socket
  connect(): void {
    this.socket.connect();
  }
}
