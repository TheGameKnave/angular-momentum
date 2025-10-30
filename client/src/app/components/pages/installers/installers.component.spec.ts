import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstallersComponent } from './installers.component';
import { InstallersService } from '@app/services/installers.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { ConnectivityService } from '@app/services/connectivity.service';
import { Button, ButtonModule } from 'primeng/button';

class MockConnectivityService {
  showOffline = signal(false);
  isOnline = signal(true);
  start(): Promise<void> {
    return Promise.resolve(); // no-op for tests
  }
}

describe('InstallersComponent initialization', () => {
  let component: InstallersComponent;
  let fixture: ComponentFixture<InstallersComponent>;
  let installersServiceSpy: jasmine.SpyObj<InstallersService>;

  const mockCurrentInstaller = {
    name: 'MacOS',
    icon: 'pi-apple',
    url: 'https://cdn/angularmomentum-1.0.0.dmg'
  };

  const mockOtherInstallers = [
    { name: 'Windows', icon: 'pi-windows', url: 'https://cdn/angularmomentum-1.0.0.exe' },
    { name: 'Linux', icon: 'pi-linux', url: 'https://cdn/angularmomentum-1.0.0.AppImage' },
  ];

  beforeEach(async () => {
    installersServiceSpy = jasmine.createSpyObj('InstallersService', [
      'getCurrentPlatformInstaller',
      'getOtherInstallers'
    ]);

    installersServiceSpy.getCurrentPlatformInstaller.and.returnValue(mockCurrentInstaller);
    installersServiceSpy.getOtherInstallers.and.returnValue(mockOtherInstallers);

    await TestBed.configureTestingModule({
      imports: [InstallersComponent, getTranslocoModule(), ButtonModule],
      providers: [
        { provide: InstallersService, useValue: installersServiceSpy },
        { provide: ConnectivityService, useClass: MockConnectivityService },
        provideNoopAnimations(),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InstallersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the Installers heading', () => {
    const heading = fixture.debugElement.query(By.css('h2')).nativeElement;
    expect(heading.textContent).toContain('Installers');
  });

  it('should call getCurrentInstaller and getOtherInstallers on initialization', () => {
    expect(installersServiceSpy.getCurrentPlatformInstaller).toHaveBeenCalled();
    expect(installersServiceSpy.getOtherInstallers).toHaveBeenCalled();
  });

  it('should render a button for the current platform installer', () => {
    // Query the <a> with pButton directive
    const buttonEl: HTMLAnchorElement = fixture.debugElement.query(By.css('a[pButton]')).nativeElement;

    expect(buttonEl).toBeTruthy();
    expect(buttonEl.getAttribute('href')).toBe(mockCurrentInstaller.url);

    const icon = buttonEl.querySelector('i');
    expect(icon?.className).toContain(mockCurrentInstaller.icon);

    expect(buttonEl.textContent).toContain(mockCurrentInstaller.name);
  });

  it('should render a list of other installers inside the panel', () => {
    const panelLinks = fixture.debugElement.queryAll(By.css('p-panel a[pButton]'));
    expect(panelLinks.length).toBe(mockOtherInstallers.length);

    mockOtherInstallers.forEach((installer, index) => {
      const anchor = panelLinks[index].nativeElement;
      const icon = anchor.querySelector('i');
      expect(anchor.getAttribute('href')).toBe(installer.url);
      expect(anchor.textContent).toContain(installer.name);
      expect(icon.className).toContain(installer.icon);
    });
  });
});
