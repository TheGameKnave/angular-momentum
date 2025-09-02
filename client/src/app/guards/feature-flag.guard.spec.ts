import { TestBed } from '@angular/core/testing';
import { FeatureFlagGuard } from './feature-flag.guard';
import { Router, ActivatedRouteSnapshot, UrlSegment } from '@angular/router';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { HelpersService } from '@app/services/helpers.service';
import { ComponentInstance } from '@app/models/data.model';
import { Component } from '@angular/core';

@Component({selector: 'mock-comp-a', template: '' })
class MockComponentA {}

describe('FeatureFlagGuard', () => {
  let guard: FeatureFlagGuard;
  let routerSpy: jasmine.SpyObj<Router>;
  let helpersServiceSpy: jasmine.SpyObj<HelpersService>;
  let slugPipe: SlugPipe;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    helpersServiceSpy = jasmine.createSpyObj('HelpersService', ['enabledComponents']);
    slugPipe = new SlugPipe();

    TestBed.configureTestingModule({
      providers: [
        FeatureFlagGuard,
        { provide: Router, useValue: routerSpy },
        { provide: HelpersService, useValue: helpersServiceSpy },
        SlugPipe, // provide it normally because it has no dependencies
      ],
    });

    guard = TestBed.inject(FeatureFlagGuard);
  });

  function createRoute(urlSegments: string[]): ActivatedRouteSnapshot {
    const route = new ActivatedRouteSnapshot();
    route.url = urlSegments.map(path => new UrlSegment(path, {}));
    return route;
  }

  it('should allow navigation when route is enabled', () => {
    const components: ComponentInstance[] = [
      { name: 'Feature A', component: MockComponentA, icon: '' },
      { name: 'Feature B', component: MockComponentA, icon: '' },
    ];

    helpersServiceSpy.enabledComponents.and.returnValue(components);
    // SlugPipe transforms spaces to dashes and lowercases by default
    spyOn(slugPipe, 'transform').and.callFake(name => name.toLowerCase().replace(/\s+/g, '-'));

    const route = createRoute(['feature-a']);

    // Override guard slugPipe with our spy
    (guard as any).slugPipe = slugPipe;

    const canActivate = guard.canActivate(route);

    expect(canActivate).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to root and disallow navigation when route is disabled', () => {
    const components: ComponentInstance[] = [
      { name: 'Feature A', component: MockComponentA, icon: '' },
    ];

    helpersServiceSpy.enabledComponents.and.returnValue(components);
    spyOn(slugPipe, 'transform').and.callFake(name => name.toLowerCase().replace(/\s+/g, '-'));

    const route = createRoute(['feature-b']);

    (guard as any).slugPipe = slugPipe;

    const canActivate = guard.canActivate(route);

    expect(canActivate).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });
});
