import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstallersComponent } from './installers.component';
import { InstallersService } from '@app/services/installers.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { By } from '@angular/platform-browser';

describe('InstallersComponent initialization', () => {
  let component: InstallersComponent;
  let fixture: ComponentFixture<InstallersComponent>;
  let installersServiceSpy: jasmine.SpyObj<InstallersService>;

  const mockInstallers = [
    { name: 'MacOS', icon: 'pi-apple', url: 'https://cdn/angularmomentum-1.0.0.dmg' },
    { name: 'Windows', icon: 'pi-windows', url: 'https://cdn/angularmomentum-1.0.0.exe' },
  ];

  beforeEach(async () => {
    installersServiceSpy = jasmine.createSpyObj('InstallersService', ['getInstallers']);
    installersServiceSpy.getInstallers.and.returnValue(mockInstallers);

    await TestBed.configureTestingModule({
      imports: [
        InstallersComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: InstallersService, useValue: installersServiceSpy },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InstallersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the Installers heading', () => {
    const heading = fixture.debugElement.query(By.css('h2')).nativeElement;
    expect(heading.textContent).toContain('Installers');
  });

  it('should call getInstallers on initialization', () => {
    expect(installersServiceSpy.getInstallers).toHaveBeenCalled();
  });

  it('should render a list item for each installer', () => {
    const listItems = fixture.debugElement.queryAll(By.css('ul li'));
    expect(listItems.length).toBe(mockInstallers.length);

    mockInstallers.forEach((installer, index) => {
      const anchor = listItems[index].query(By.css('a')).nativeElement;
      const icon = listItems[index].query(By.css('i')).nativeElement;
      expect(anchor.getAttribute('href')).toBe(installer.url);
      expect(anchor.textContent).toContain(installer.name);
      expect(icon.className).toContain(installer.icon);
    });
  });
});
