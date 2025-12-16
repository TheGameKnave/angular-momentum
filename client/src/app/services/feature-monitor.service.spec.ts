import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { FeatureMonitorService } from './feature-monitor.service';
import { HelpersService } from '@app/services/helpers.service';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { Router } from '@angular/router';
import { COMPONENT_LIST } from '@app/helpers/component-list';

describe('FeatureMonitorService', () => {
  let service: FeatureMonitorService;
  let router: jasmine.SpyObj<Router>;
  let helpersService: jasmine.SpyObj<HelpersService>;
  let slugPipe: jasmine.SpyObj<SlugPipe>;

  let mockUrl = '/current-route'; // used by the router.url getter

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    // Define the getter ONCE
    Object.defineProperty(routerSpy, 'url', {
      get: () => mockUrl,
      configurable: true, // prevent redefinition errors
    });

    TestBed.configureTestingModule({
      providers: [
        FeatureMonitorService,
        { provide: Router, useValue: routerSpy },
        { provide: HelpersService, useValue: jasmine.createSpyObj('HelpersService', ['enabledComponents']) },
        { provide: SlugPipe, useValue: jasmine.createSpyObj('SlugPipe', ['transform']) },
      ],
    });

    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    helpersService = TestBed.inject(HelpersService) as jasmine.SpyObj<HelpersService>;
    slugPipe = TestBed.inject(SlugPipe) as jasmine.SpyObj<SlugPipe>;
  });

  it('should be created', () => {
    service = TestBed.inject(FeatureMonitorService);
    expect(service).toBeTruthy();
  });

  it('should redirect if current route is not enabled', fakeAsync(() => {
    mockUrl = '/not-enabled';
    
    helpersService.enabledComponents.and.returnValue([]); // nothing enabled
    slugPipe.transform.and.callFake(name => name.toLowerCase().replace(/\s+/g, '-'));
    
    service = TestBed.inject(FeatureMonitorService);
    flushMicrotasks();
    tick();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  }));

  it('should NOT redirect if current route is enabled', fakeAsync(() => {
    mockUrl = '/features';

    helpersService.enabledComponents.and.returnValue([COMPONENT_LIST[0]]); // Features component
    slugPipe.transform.and.returnValue('features');

    service = TestBed.inject(FeatureMonitorService);
    flushMicrotasks();
    tick();

    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('should handle empty or root url and set current segment to empty string', fakeAsync(() => {
    mockUrl = '/'; // or ''

    helpersService.enabledComponents.and.returnValue([]);
    slugPipe.transform.and.callFake(name => name.toLowerCase().replace(/\s+/g, '-'));

    service = TestBed.inject(FeatureMonitorService);
    flushMicrotasks();
    tick();

    // Since currentSegment is '', it's a static route and should not redirect
    expect(router.navigate).not.toHaveBeenCalledWith(['/']);
  }));

  it('should NOT redirect for static routes (profile, privacy)', fakeAsync(() => {
    mockUrl = '/privacy';

    helpersService.enabledComponents.and.returnValue([]); // nothing enabled
    slugPipe.transform.and.callFake(name => name.toLowerCase().replace(/\s+/g, '-'));

    service = TestBed.inject(FeatureMonitorService);
    flushMicrotasks();
    tick();

    // privacy is a static route, should not redirect
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('should NOT redirect for profile route', fakeAsync(() => {
    mockUrl = '/profile';

    helpersService.enabledComponents.and.returnValue([]);
    slugPipe.transform.and.callFake(name => name.toLowerCase().replace(/\s+/g, '-'));

    service = TestBed.inject(FeatureMonitorService);
    flushMicrotasks();
    tick();

    // profile is a static route, should not redirect
    expect(router.navigate).not.toHaveBeenCalled();
  }));
});
