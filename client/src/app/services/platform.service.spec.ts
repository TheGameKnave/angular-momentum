import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { PlatformService, Platform } from './platform.service';

describe('PlatformService', () => {
  describe('Web Browser Environment', () => {
    let service: PlatformService;

    beforeEach(() => {
      // Mock browser platform
      TestBed.configureTestingModule({
        providers: [
          PlatformService,
          { provide: PLATFORM_ID, useValue: 'browser' }
        ]
      });

      service = TestBed.inject(PlatformService);
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should detect web browser platform', () => {
      expect(service.currentPlatform()).toBe(Platform.WEB_BROWSER);
    });

    it('should return true for isWeb()', () => {
      expect(service.isWeb()).toBe(true);
    });

    it('should return false for isTauri()', () => {
      expect(service.isTauri()).toBe(false);
    });

    it('should return false for isSSR()', () => {
      expect(service.isSSR()).toBe(false);
    });

    it('should return true for isBrowser()', () => {
      expect(service.isBrowser()).toBe(true);
    });

    it('should return correct platform name', () => {
      expect(service.getPlatformName()).toBe('web');
    });
  });

  describe('SSR Server Environment', () => {
    let service: PlatformService;

    beforeEach(() => {
      // Mock server platform
      TestBed.configureTestingModule({
        providers: [
          PlatformService,
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });

      service = TestBed.inject(PlatformService);
    });

    it('should detect SSR server platform', () => {
      expect(service.currentPlatform()).toBe(Platform.SSR_SERVER);
    });

    it('should return false for isWeb()', () => {
      expect(service.isWeb()).toBe(false);
    });

    it('should return false for isTauri()', () => {
      expect(service.isTauri()).toBe(false);
    });

    it('should return true for isSSR()', () => {
      expect(service.isSSR()).toBe(true);
    });

    it('should return false for isBrowser()', () => {
      expect(service.isBrowser()).toBe(false);
    });

    it('should return correct platform name', () => {
      expect(service.getPlatformName()).toBe('ssr');
    });
  });

  describe('Tauri Environment', () => {
    let service: PlatformService;

    beforeEach(() => {
      // Mock Tauri environment
      (window as any).__TAURI__ = {};

      TestBed.configureTestingModule({
        providers: [
          PlatformService,
          { provide: PLATFORM_ID, useValue: 'browser' }
        ]
      });

      service = TestBed.inject(PlatformService);
    });

    afterEach(() => {
      delete (window as any).__TAURI__;
    });

    it('should detect Tauri platform', () => {
      expect(service.currentPlatform()).toBe(Platform.TAURI_APP);
    });

    it('should return false for isWeb()', () => {
      expect(service.isWeb()).toBe(false);
    });

    it('should return true for isTauri()', () => {
      expect(service.isTauri()).toBe(true);
    });

    it('should return false for isSSR()', () => {
      expect(service.isSSR()).toBe(false);
    });

    it('should return true for isBrowser()', () => {
      expect(service.isBrowser()).toBe(true);
    });

    it('should return correct platform name', () => {
      expect(service.getPlatformName()).toBe('tauri');
    });
  });
});
