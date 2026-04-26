import { signal } from '@angular/core';
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
  // Backs the enabledComponents spy so tests can drive a second emission
  // after the service's first-tick latch has consumed the initial value.
  let enabledBacking = signal<typeof COMPONENT_LIST>([]);

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    // Define the getter ONCE
    Object.defineProperty(routerSpy, 'url', {
      get: () => mockUrl,
      configurable: true, // prevent redefinition errors
    });

    enabledBacking = signal<typeof COMPONENT_LIST>([]);
    const helpersSpy = jasmine.createSpyObj('HelpersService', ['enabledComponents']);
    helpersSpy.enabledComponents.and.callFake(() => enabledBacking());

    TestBed.configureTestingModule({
      providers: [
        FeatureMonitorService,
        { provide: Router, useValue: routerSpy },
        { provide: HelpersService, useValue: helpersSpy },
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

    slugPipe.transform.and.callFake(name => name.toLowerCase().replace(/\s+/g, '-'));

    // First tick seeds the latch (no redirect even though route isn't allowed).
    service = TestBed.inject(FeatureMonitorService);
    flushMicrotasks();
    tick();
    expect(router.navigate).not.toHaveBeenCalled();

    // Second tick: flags hydrated but route still not in allowed list -> redirect.
    enabledBacking.set([]);
    flushMicrotasks();
    tick();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  }));

  it("doesn't redirect on initial flag hydration even when route isn't allowed yet", fakeAsync(() => {
    mockUrl = '/not-enabled';

    slugPipe.transform.and.callFake(name => name.toLowerCase().replace(/\s+/g, '-'));

    service = TestBed.inject(FeatureMonitorService);
    flushMicrotasks();
    tick();

    // First and only emission so far is the synchronous registration tick.
    // The latch must swallow it so a deep-link doesn't bounce before flags arrive.
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('should NOT redirect if current route is enabled', fakeAsync(() => {
    mockUrl = '/features';

    slugPipe.transform.and.returnValue('features');

    // First tick seeds the latch.
    service = TestBed.inject(FeatureMonitorService);
    flushMicrotasks();
    tick();

    // Second tick: flags hydrated and route IS allowed -> no redirect.
    enabledBacking.set([COMPONENT_LIST[0]]);
    flushMicrotasks();
    tick();

    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('should handle empty or root url and set current segment to empty string', fakeAsync(() => {
    mockUrl = '/'; // or ''

    slugPipe.transform.and.callFake(name => name.toLowerCase().replace(/\s+/g, '-'));

    service = TestBed.inject(FeatureMonitorService);
    flushMicrotasks();
    tick();

    enabledBacking.set([]);
    flushMicrotasks();
    tick();

    // Since currentSegment is '', it's a static route and should not redirect
    expect(router.navigate).not.toHaveBeenCalledWith(['/']);
  }));

  it('should NOT redirect for static routes (profile, privacy)', fakeAsync(() => {
    mockUrl = '/privacy';

    slugPipe.transform.and.callFake(name => name.toLowerCase().replace(/\s+/g, '-'));

    service = TestBed.inject(FeatureMonitorService);
    flushMicrotasks();
    tick();

    enabledBacking.set([]);
    flushMicrotasks();
    tick();

    // privacy is a static route, should not redirect
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('should NOT redirect for profile route', fakeAsync(() => {
    mockUrl = '/profile';

    slugPipe.transform.and.callFake(name => name.toLowerCase().replace(/\s+/g, '-'));

    service = TestBed.inject(FeatureMonitorService);
    flushMicrotasks();
    tick();

    enabledBacking.set([]);
    flushMicrotasks();
    tick();

    // profile is a static route, should not redirect
    expect(router.navigate).not.toHaveBeenCalled();
  }));
});
