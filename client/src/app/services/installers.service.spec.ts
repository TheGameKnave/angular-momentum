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

  it('should return an array of installers', () => {
    const installers = service.getInstallers();
    expect(Array.isArray(installers)).toBeTrue();
    expect(installers.length).toBe(INSTALLERS.length);
  });

  it('should replace {version} in urls with the package.json version', () => {
    const installers = service.getInstallers();

    installers.forEach((installer, index) => {
      const originalUrl = INSTALLERS[index].url;
      expect(installer.url).toBe(
        originalUrl.replace(/{version}/g, packageJson.version)
      );
    });
  });

  it('should not mutate the original INSTALLERS array', () => {
    const originalUrls = INSTALLERS.map(i => i.url);
    service.getInstallers();
    expect(INSTALLERS.map(i => i.url)).toEqual(originalUrls);
  });
});
