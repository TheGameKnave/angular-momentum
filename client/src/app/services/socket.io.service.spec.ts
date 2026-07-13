import { TestBed } from '@angular/core/testing';
import { SocketIoService } from '@app/services/socket.io.service';
import { Socket } from 'ngx-socket-io';
import { ConnectivityService } from './connectivity.service';
import { PLATFORM_ID, signal } from '@angular/core';

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
  });

  describe('in the browser with a socket', () => {
    beforeEach(() => {
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

    describe('connectivity effect', () => {
      it('should connect the socket when online at startup', () => {
        TestBed.flushEffects();

        expect(socketSpy.connect).toHaveBeenCalledTimes(1);
        expect(socketSpy.disconnect).not.toHaveBeenCalled();
      });

      it('should disconnect the socket when connectivity is lost', () => {
        TestBed.flushEffects();
        socketSpy.connect.calls.reset();

        connectivityMock.isOnline.set(false);
        TestBed.flushEffects();

        expect(socketSpy.disconnect).toHaveBeenCalledTimes(1);
        expect(socketSpy.connect).not.toHaveBeenCalled();
      });

      it('should reconnect the socket when connectivity is restored', () => {
        connectivityMock.isOnline.set(false);
        TestBed.flushEffects();
        socketSpy.connect.calls.reset();
        socketSpy.disconnect.calls.reset();

        connectivityMock.isOnline.set(true);
        TestBed.flushEffects();

        expect(socketSpy.connect).toHaveBeenCalledTimes(1);
        expect(socketSpy.disconnect).not.toHaveBeenCalled();
      });
    });
  });

  describe('on a non-browser platform', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: Socket, useValue: socketSpy },
          { provide: ConnectivityService, useValue: connectivityMock },
          { provide: PLATFORM_ID, useValue: 'server' },
        ]
      });

      service = TestBed.inject(SocketIoService);
    });

    it('should not register the connectivity effect', () => {
      TestBed.flushEffects();
      connectivityMock.isOnline.set(false);
      TestBed.flushEffects();

      expect(socketSpy.connect).not.toHaveBeenCalled();
      expect(socketSpy.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('without a socket (SSR)', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: ConnectivityService, useValue: connectivityMock },
        ]
      });

      service = TestBed.inject(SocketIoService);
    });

    it('should not register the connectivity effect', () => {
      expect(service.socket).toBeNull();

      connectivityMock.isOnline.set(false);
      TestBed.flushEffects();
      connectivityMock.isOnline.set(true);
      TestBed.flushEffects();

      expect(socketSpy.connect).not.toHaveBeenCalled();
      expect(socketSpy.disconnect).not.toHaveBeenCalled();
    });

    it('should no-op on emit, connect, and disconnect', () => {
      expect(() => {
        service.emit('test-event', { foo: 'bar' });
        service.connect();
        service.disconnect();
      }).not.toThrow();

      expect(socketSpy.emit).not.toHaveBeenCalled();
      expect(socketSpy.connect).not.toHaveBeenCalled();
      expect(socketSpy.disconnect).not.toHaveBeenCalled();
    });
  });
});
