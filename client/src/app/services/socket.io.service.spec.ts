import { TestBed } from '@angular/core/testing';
import { SocketIoService } from '@app/services/socket.io.service';
import { Socket } from 'ngx-socket-io';
import { ConnectivityService } from './connectivity.service';
import { signal } from '@angular/core';

describe('SocketIoService', () => {
  let service: SocketIoService;
  let socketSpy: jasmine.SpyObj<Socket>;
  let connectivityMock: { isOnline: ReturnType<typeof signal<boolean>>; stop: jasmine.Spy };

  beforeEach(() => {
    socketSpy = jasmine.createSpyObj('Socket', ['fromEvent', 'emit', 'disconnect', 'connect']);
    connectivityMock = {
      isOnline: signal(true),
      stop: jasmine.createSpy('stop'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Socket, useValue: socketSpy },
        { provide: ConnectivityService, useValue: connectivityMock },
      ]
    });

    service = TestBed.inject(SocketIoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call fromEvent on Socket when listen is called', () => {
    const event = 'test-event';
    service.listen(event);
    expect(socketSpy.fromEvent).toHaveBeenCalledTimes(1);
    expect(socketSpy.fromEvent).toHaveBeenCalledWith(event);
  });

  it('should call emit on Socket when emit is called', () => {
    const event = 'test-event';
    const payload = { foo: 'bar' };
    service.emit(event, payload);
    expect(socketSpy.emit).toHaveBeenCalledTimes(1);
    expect(socketSpy.emit).toHaveBeenCalledWith(event, payload);
  });

  it('should call disconnect on Socket when disconnect is called', () => {
    service.disconnect();
    expect(socketSpy.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should call connect on Socket when connect is called', () => {
    service.connect();
    expect(socketSpy.connect).toHaveBeenCalledTimes(1);
  });
});
