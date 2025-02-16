import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { UpdateService } from './services/update.service';
import { CookieService } from 'ngx-cookie-service';
import { FooterComponent } from './components/layout/footer/footer.component';
import { getTranslocoModule } from '../../../tests/helpers/transloco-testing.module';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FeatureFlagService } from './services/feature-flag.service';
import { Socket } from 'ngx-socket-io';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let updateService: jasmine.SpyObj<UpdateService>;

  beforeEach(() => {
    const updateServiceSpy = jasmine.createSpyObj('UpdateService', ['checkForUpdates']);
    const socketSpy = jasmine.createSpyObj('Socket', ['on', 'fromEvent', 'emit', 'disconnect', 'connect']);

    TestBed.configureTestingModule({
      imports: [
        FooterComponent,
        AppComponent,
        getTranslocoModule(),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UpdateService, useValue: updateServiceSpy },
        { provide: Socket, useValue: socketSpy },
        FeatureFlagService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    updateService = TestBed.inject(UpdateService) as jasmine.SpyObj<UpdateService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle activeComponent correctly', () => {
    const newComponent = 'Environment';
    component.onComponentActivate(newComponent);
    expect(component.activeComponent).toBe(newComponent);
  });

  it('should call checkForUpdates on construction', () => {
    // Ensure checkForUpdates is called once
    expect(updateService.checkForUpdates).toHaveBeenCalled();
  });

  it('should have the correct english title', () => {
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('h1')).nativeElement.innerText).toBe('Angular Momentum');
  });
});

describe('CookieService', () => {
  // this isn't the MOST robust test of the cookie implementation.
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let updateService: jasmine.SpyObj<UpdateService>;
  let cookieService: jasmine.SpyObj<CookieService>;
  let featureFlagService: jasmine.SpyObj<FeatureFlagService>;

  beforeEach(() => {
    const updateServiceSpy = jasmine.createSpyObj('UpdateService', ['checkForUpdates']);
    const cookieServiceSpy = jasmine.createSpyObj('CookieService', ['get', 'set']);
    const featureFlagServiceSpy = jasmine.createSpyObj('FeatureFlagService', ['getFeature']);

    TestBed.configureTestingModule({
      imports: [
        FooterComponent,
        AppComponent,
        getTranslocoModule(),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UpdateService, useValue: updateServiceSpy },
        { provide: CookieService, useValue: cookieServiceSpy },
        { provide: FeatureFlagService, useValue: featureFlagServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    updateService = TestBed.inject(UpdateService) as jasmine.SpyObj<UpdateService>;
    cookieService = TestBed.inject(CookieService) as jasmine.SpyObj<CookieService>;
    featureFlagService = TestBed.inject(FeatureFlagService) as jasmine.SpyObj<FeatureFlagService>;
  });
  it('should set activeComponent to null when cookie is empty or null', () => {
    cookieService.get.and.returnValue('');
    fixture.detectChanges();
    expect(component.activeComponent).toBeNull();

    cookieService.get.and.returnValue('null');
    fixture.detectChanges();
    expect(component.activeComponent).toBeNull();
  });

  it('should set activeComponent to the cookie value when it is a string', () => {
    featureFlagService.getFeature.and.returnValue(true);
    cookieService.get.and.returnValue('Environment');
    fixture.detectChanges();
    expect(component.activeComponent).toBe('Environment');
  });

  it('should set the cookie when onComponentActivate is called', () => {
    component.onComponentActivate('Environment');
    expect(cookieService.set).toHaveBeenCalledWith('activeButton', 'Environment');

    component.onComponentActivate(null);
    expect(cookieService.set).toHaveBeenCalledWith('activeButton', 'null');
  });

});
