import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { UpdateService } from './services/update.service';
import { CookieService } from 'ngx-cookie-service';
import { FooterComponent } from './components/shared/footer/footer.component';
import { ExampleOneComponent } from './components/example-one/example-one.component';
import { ExampleTwoComponent } from './components/example-two/example-two.component';
import { getTranslocoModule } from './helpers/transloco-testing.module';
import { By } from '@angular/platform-browser';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let updateService: jasmine.SpyObj<UpdateService>;
  let cookieService: jasmine.SpyObj<CookieService>;

  beforeEach(() => {
    const updateServiceSpy = jasmine.createSpyObj('UpdateService', ['checkForUpdates']);

    TestBed.configureTestingModule({
      imports: [
        FooterComponent,
        ExampleOneComponent,
        ExampleTwoComponent,
        AppComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: UpdateService, useValue: updateServiceSpy },
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
    const newComponent = 1;
    component.onComponentActivate(newComponent);
    expect(component.activeComponent).toBe(newComponent);
  });

  it('should call checkForUpdates on construction', () => {
    // Ensure checkForUpdates is called once
    expect(updateService.checkForUpdates).toHaveBeenCalled();
  });

  it('should have the correct english title', () => {
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('h1')).nativeElement.innerText).toBe('Angular Boilerplate');
  });
});

describe('CookieService', () => {
  // this isn't the MOST robust test of the cookie implementation.
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let updateService: jasmine.SpyObj<UpdateService>;
  let cookieService: jasmine.SpyObj<CookieService>;
  beforeEach(() => {
    const updateServiceSpy = jasmine.createSpyObj('UpdateService', ['checkForUpdates']);
    const cookieServiceSpy = jasmine.createSpyObj('CookieService', ['get', 'set']);

    TestBed.configureTestingModule({
      imports: [
        FooterComponent,
        ExampleOneComponent,
        ExampleTwoComponent,
        AppComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: UpdateService, useValue: updateServiceSpy },
        { provide: CookieService, useValue: cookieServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    updateService = TestBed.inject(UpdateService) as jasmine.SpyObj<UpdateService>;
    cookieService = TestBed.inject(CookieService) as jasmine.SpyObj<CookieService>;
  });
  it('should set activeComponent to null when cookie is empty or null', () => {
    cookieService.get.and.returnValue('');
    fixture.detectChanges();
    expect(component.activeComponent).toBeNull();

    cookieService.get.and.returnValue('null');
    fixture.detectChanges();
    expect(component.activeComponent).toBeNull();
  });

  it('should set activeComponent to the cookie value when it is a number', () => {
    cookieService.get.and.returnValue('1');
    fixture.detectChanges();
    expect(component.activeComponent).toBe(1);
  });

  it('should set the cookie when onComponentActivate is called', () => {
    component.onComponentActivate(1);
    expect(cookieService.set).toHaveBeenCalledWith('activeButton', '1');

    component.onComponentActivate(null);
    expect(cookieService.set).toHaveBeenCalledWith('activeButton', 'null');
  });

});
