import { TestBed } from '@angular/core/testing';
import { InstallersService } from './installers.service';
import { INSTALLERS } from '@app/constants/app.constants';
import packageJson from 'src/../package.json';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ChangeLogService } from './change-log.service';
import { signal } from '@angular/core';

describe('InstallersService', () => {
  let service: InstallersService;
  let mockChangeLogService: any;

  beforeEach(() => {
    mockChangeLogService = {
      // Use custom equality to allow forcing re-evaluation with same value
      appVersion: signal(packageJson.version, { equal: () => false })
    };
    TestBed.configureTestingModule({
      providers: [
        InstallersService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ChangeLogService, useValue: mockChangeLogService },
      ]
    });
    service = TestBed.inject(InstallersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should replace {version} tokens in all installer URLs', () => {
    const current = service.getCurrentPlatformInstaller();
    const others = service.getOtherInstallers();
    const all = [current, ...others];

    all.forEach(installer => {
      const templateUrl = INSTALLERS.find(i => i.name === installer.name)?.url!;
      expect(installer.url).toBe(templateUrl.replace(/{version}/g, packageJson.version));
    });
  });

  it('should not mutate the original INSTALLERS array', () => {
    const originalUrls = INSTALLERS.map(i => i.url);
    service.getOtherInstallers(); // triggers internal getInstallers()
    expect(INSTALLERS.map(i => i.url)).toEqual(originalUrls);
  });

  it('should handle Unknown platform gracefully by returning first installer as fallback', () => {
    const originalUserAgent = navigator.userAgent;

    // 🧩 Override the property descriptor safely
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'MysteryDevice/1.0',
      configurable: true,
    });

    // Unknown platform falls back to first installer (for SSR compatibility)
    const unknownInstaller = service.getCurrentPlatformInstaller();
    expect(unknownInstaller).toBeDefined();
    expect(unknownInstaller.name).toBe(INSTALLERS[0].name);

    const otherInstallers = service.getOtherInstallers();
    expect(Array.isArray(otherInstallers)).toBeTrue();
    expect(otherInstallers.length).toBe(INSTALLERS.length);

    // 🔧 Restore original userAgent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
  });

  it('should cache installers when version unchanged', () => {
    // First call - builds cache
    const first = service.getOtherInstallers();

    // Set to same value - signal will notify due to custom equality,
    // forcing computed re-run, but cache check should pass
    mockChangeLogService.appVersion.set(packageJson.version);
    const second = service.getOtherInstallers();

    // Should be the same cached array (tests cache hit branch)
    expect(second).toBe(first);
  });

});
