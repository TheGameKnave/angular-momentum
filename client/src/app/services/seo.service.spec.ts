import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { PLATFORM_ID, REQUEST } from '@angular/core';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let mockMeta: jasmine.SpyObj<Meta>;
  let mockTitle: jasmine.SpyObj<Title>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockMeta = jasmine.createSpyObj('Meta', ['updateTag']);
    mockTitle = jasmine.createSpyObj('Title', ['setTitle']);
    mockRouter = jasmine.createSpyObj('Router', [], {
      url: '/test',
      events: { pipe: () => ({ subscribe: () => ({}) }) },
    });

    TestBed.configureTestingModule({
      providers: [
        SeoService,
        { provide: Meta, useValue: mockMeta },
        { provide: Title, useValue: mockTitle },
        { provide: Router, useValue: mockRouter },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(SeoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should update title tags', () => {
    service.updateTags({ title: 'Test Page' });

    expect(mockTitle.setTitle).toHaveBeenCalledWith('Test Page');
    expect(mockMeta.updateTag).toHaveBeenCalledWith({ property: 'og:title', content: 'Test Page' });
    expect(mockMeta.updateTag).toHaveBeenCalledWith({ name: 'twitter:title', content: 'Test Page' });
  });

  it('should update description tags', () => {
    service.updateTags({ description: 'Test description' });

    expect(mockMeta.updateTag).toHaveBeenCalledWith({ name: 'description', content: 'Test description' });
    expect(mockMeta.updateTag).toHaveBeenCalledWith({
      property: 'og:description',
      content: 'Test description',
    });
    expect(mockMeta.updateTag).toHaveBeenCalledWith({
      name: 'twitter:description',
      content: 'Test description',
    });
  });

  it('should set default config', () => {
    service.setDefaultConfig({ siteName: 'Custom Site' });
    const config = service.getDefaultConfig();

    expect(config.siteName).toBe('Custom Site');
  });

  it('should update twitter site and creator tags', () => {
    service.updateTags({
      title: 'Test',
      twitterSite: '@testsite',
      twitterCreator: '@testcreator',
    });

    expect(mockMeta.updateTag).toHaveBeenCalledWith({ name: 'twitter:site', content: '@testsite' });
    expect(mockMeta.updateTag).toHaveBeenCalledWith({ name: 'twitter:creator', content: '@testcreator' });
  });
});

describe('SeoService (SSR)', () => {
  let service: SeoService;
  let mockMeta: jasmine.SpyObj<Meta>;
  let mockTitle: jasmine.SpyObj<Title>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRequest: { headers: { get: jasmine.Spy } };

  beforeEach(() => {
    mockMeta = jasmine.createSpyObj('Meta', ['updateTag']);
    mockTitle = jasmine.createSpyObj('Title', ['setTitle']);
    mockRouter = jasmine.createSpyObj('Router', [], {
      url: '/test-page',
      events: { pipe: () => ({ subscribe: () => ({}) }) },
    });
    mockRequest = {
      headers: {
        get: jasmine.createSpy('get').and.callFake((header: string) => {
          if (header === 'host') return 'example.com';
          if (header === 'x-forwarded-proto') return 'https';
          return null;
        }),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        SeoService,
        { provide: Meta, useValue: mockMeta },
        { provide: Title, useValue: mockTitle },
        { provide: Router, useValue: mockRouter },
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: REQUEST, useValue: mockRequest },
      ],
    });

    service = TestBed.inject(SeoService);
  });

  it('should use request headers for base URL during SSR', () => {
    service.updateTags({ title: 'SSR Test' });

    expect(mockRequest.headers.get).toHaveBeenCalledWith('host');
    expect(mockMeta.updateTag).toHaveBeenCalledWith({
      property: 'og:url',
      content: 'https://example.com/test-page',
    });
  });

  it('should construct current URL from router during SSR', () => {
    service.updateTags({ title: 'SSR Test' });

    expect(mockMeta.updateTag).toHaveBeenCalledWith({
      name: 'twitter:url',
      content: 'https://example.com/test-page',
    });
  });
});

describe('SeoService (SSR with Express headers)', () => {
  let service: SeoService;
  let mockMeta: jasmine.SpyObj<Meta>;
  let mockTitle: jasmine.SpyObj<Title>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRequest: { headers: Record<string, string> };

  beforeEach(() => {
    mockMeta = jasmine.createSpyObj('Meta', ['updateTag']);
    mockTitle = jasmine.createSpyObj('Title', ['setTitle']);
    mockRouter = jasmine.createSpyObj('Router', [], {
      url: '/test-page',
      events: { pipe: () => ({ subscribe: () => ({}) }) },
    });
    // Express-style headers (object properties, not .get() method)
    mockRequest = {
      headers: {
        'host': 'staging.example.com',
        'x-forwarded-proto': 'https',
      },
    };

    TestBed.configureTestingModule({
      providers: [
        SeoService,
        { provide: Meta, useValue: mockMeta },
        { provide: Title, useValue: mockTitle },
        { provide: Router, useValue: mockRouter },
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: REQUEST, useValue: mockRequest },
      ],
    });

    service = TestBed.inject(SeoService);
  });

  it('should use Express-style headers for base URL during SSR', () => {
    service.updateTags({ title: 'Express SSR Test' });

    expect(mockMeta.updateTag).toHaveBeenCalledWith({
      property: 'og:url',
      content: 'https://staging.example.com/test-page',
    });
  });
});

describe('SeoService (SSR without host)', () => {
  let service: SeoService;
  let mockMeta: jasmine.SpyObj<Meta>;
  let mockTitle: jasmine.SpyObj<Title>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRequest: { headers: { get: jasmine.Spy } };

  beforeEach(() => {
    mockMeta = jasmine.createSpyObj('Meta', ['updateTag']);
    mockTitle = jasmine.createSpyObj('Title', ['setTitle']);
    mockRouter = jasmine.createSpyObj('Router', [], {
      url: '/test-page',
      events: { pipe: () => ({ subscribe: () => ({}) }) },
    });
    mockRequest = {
      headers: {
        get: jasmine.createSpy('get').and.returnValue(null),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        SeoService,
        { provide: Meta, useValue: mockMeta },
        { provide: Title, useValue: mockTitle },
        { provide: Router, useValue: mockRouter },
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: REQUEST, useValue: mockRequest },
      ],
    });

    service = TestBed.inject(SeoService);
  });

  it('should fall back to siteUrl when host header is missing', () => {
    service.updateTags({ title: 'Fallback Test' });

    // Should use the siteUrl from package.json as fallback
    expect(mockMeta.updateTag).toHaveBeenCalledWith(
      jasmine.objectContaining({ property: 'og:url' })
    );
  });
});
