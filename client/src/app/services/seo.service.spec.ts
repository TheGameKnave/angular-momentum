import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
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
});
