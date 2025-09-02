import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { UpdateService } from '@app/services/update.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { ComponentListService } from '@app/services/component-list.service';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { Router, NavigationEnd } from '@angular/router';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Socket } from 'ngx-socket-io';
import { of } from 'rxjs';

describe('AppComponent', () => {
  let component: AppComponent;
  let componentListService: ComponentListService;
  let fixture: ComponentFixture<AppComponent>;
  let updateService: jasmine.SpyObj<UpdateService>;
  let router: jasmine.SpyObj<Router>;
  let featureFlagService: jasmine.SpyObj<FeatureFlagService>;
  let slugPipe: jasmine.SpyObj<SlugPipe>;

  beforeEach(() => {

    updateService = jasmine.createSpyObj('UpdateService', ['checkForUpdates']);
    router = jasmine.createSpyObj('Router', ['navigate'], { events: of(new NavigationEnd(0, '/environment', '/environment')) });
    featureFlagService = jasmine.createSpyObj('FeatureFlagService', ['getFeature']);
    slugPipe = jasmine.createSpyObj('SlugPipe', ['transform']);
    const socketSpy = jasmine.createSpyObj('Socket', ['on', 'fromEvent', 'emit', 'disconnect', 'connect']);

    TestBed.configureTestingModule({
      imports: [AppComponent, getTranslocoModule()],
      providers: [
        ComponentListService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UpdateService, useValue: updateService },
        { provide: Router, useValue: router },
        { provide: FeatureFlagService, useValue: featureFlagService },
        { provide: SlugPipe, useValue: slugPipe },
        { provide: Socket, useValue: socketSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    componentListService = TestBed.inject(ComponentListService);
    
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call checkForUpdates on construction', () => {
    expect(updateService.checkForUpdates).toHaveBeenCalled();
  });

  it('should toggle menu on click', () => {
    const menu = 'feature';
    const event = new Event('click');
    component.openMenu = '';
    component.toggleMenu(menu, event);
    expect(component.openMenu).toBe(menu);
  });
  
  it('should toggle menu on keydown with Enter key', () => {
    const menu = 'feature';
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    component.openMenu = '';
    component.toggleMenu(menu, event);
    expect(component.openMenu).toBe(menu);
  });
  
  it('should not toggle menu on keydown with other keys', () => {
    const menu = 'feature';
    const event = new KeyboardEvent('keydown', { key: 'Space' });
    component.openMenu = '';
    component.toggleMenu(menu, event);
    expect(component.openMenu).toBe('');
  });
  
  it('should close menu when toggling the same menu', () => {
    const menu = 'feature';
    const event = new Event('click');
    component.openMenu = menu;
    component.toggleMenu(menu, event);
    expect(component.openMenu).toBe('');
  });

});
