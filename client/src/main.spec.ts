import { TestBed } from '@angular/core/testing';
import { AppComponent } from '@app/app.component';
import { appProviders } from 'src/main.config';
// Import the main.ts file to ensure it's executed
import './main';

describe('Main', () => {
  let bootstrapApplicationSpy: jasmine.Spy<(component: any, options: any) => any>;

  beforeEach(() => {
    bootstrapApplicationSpy = jasmine.createSpy<(component: any, options: any) => any>('bootstrapApplication');
    TestBed.configureTestingModule({
      providers: appProviders,
    });
  });

  it('should bootstrap the AppComponent', () => {
    bootstrapApplicationSpy(AppComponent, {
      providers: appProviders,
    });
    expect(bootstrapApplicationSpy).toHaveBeenCalledWith(AppComponent, {
      providers: appProviders,
    });
  });
});
