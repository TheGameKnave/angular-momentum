import { TestBed } from '@angular/core/testing';
import { InstallersService } from './installers.service';
import { INSTALLERS } from '@app/helpers/constants';
import packageJson from 'src/../package.json';

describe('InstallersService', () => {
  let service: InstallersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InstallersService]
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

  it('should handle Unknown platform gracefully', () => {
    const originalUserAgent = navigator.userAgent;

    // 🧩 Override the property descriptor safely
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'MysteryDevice/1.0',
      configurable: true,
    });

    const unknownInstaller = service.getCurrentPlatformInstaller();
    expect(unknownInstaller).toBeUndefined();

    const otherInstallers = service.getOtherInstallers();
    expect(Array.isArray(otherInstallers)).toBeTrue();
    expect(otherInstallers.length).toBe(INSTALLERS.length);

    // 🔧 Restore original userAgent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
  });

});
