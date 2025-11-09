import { TestBed } from '@angular/core/testing';
import { FeatureFlagGuard } from './feature-flag.guard';
import { Router, ActivatedRouteSnapshot, UrlSegment } from '@angular/router';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { HelpersService } from '@app/services/helpers.service';
import { COMPONENT_LIST } from '@app/helpers/component-list';

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
    const components = [COMPONENT_LIST[0], COMPONENT_LIST[1]];

    helpersServiceSpy.enabledComponents.and.returnValue(components);
    // SlugPipe transforms spaces to dashes and lowercases by default
    spyOn(slugPipe, 'transform').and.callFake(name => name.toLowerCase().replace(/\s+/g, '-'));

    const route = createRoute(['features']);

    // Override guard slugPipe with our spy
    (guard as any).slugPipe = slugPipe;

    const canActivate = guard.canActivate(route);

    expect(canActivate).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to root and disallow navigation when route is disabled', () => {
    const components = [COMPONENT_LIST[0]]; // Only Features is enabled

    helpersServiceSpy.enabledComponents.and.returnValue(components);
    spyOn(slugPipe, 'transform').and.callFake(name => name.toLowerCase().replace(/\s+/g, '-'));

    const route = createRoute(['graphql-api']); // Try to access disabled GraphQL API

    (guard as any).slugPipe = slugPipe;

    const canActivate = guard.canActivate(route);

    expect(canActivate).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });
});
