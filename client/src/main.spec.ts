import { TestBed } from '@angular/core/testing';
import { AppComponent } from '@app/app.component';
import { appProviders } from 'src/main.config';
// Import the main.ts file to ensure it's executed
import './main';
import { Type } from '@angular/core';

describe('Main', () => {
  let bootstrapApplicationSpy: jasmine.Spy<(component: Type<unknown>, options: unknown) => unknown>;

  beforeEach(() => {
    bootstrapApplicationSpy = jasmine.createSpy<(component: Type<unknown>, options: unknown) => unknown>('bootstrapApplication');
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
