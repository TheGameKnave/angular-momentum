import { TestBed } from '@angular/core/testing';
import { ResourcePreloadService } from './resource-preload.service';
import { TranslocoHttpLoader } from './transloco-loader.service';

describe('ResourcePreloadService', () => {
  let service: ResourcePreloadService;

  beforeEach(() => {
    const mockTranslocoLoader = jasmine.createSpyObj('TranslocoHttpLoader', ['getCountry']);
    // Return a predictable country code for each language
    mockTranslocoLoader.getCountry.and.callFake((lang: string) => {
      if (lang.includes('-')) {
        return lang.split('-')[1].toLowerCase();
      }
      return lang.toLowerCase();
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslocoHttpLoader, useValue: mockTranslocoLoader },
      ],
    });
    service = TestBed.inject(ResourcePreloadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('preloadAll', () => {
    it('should preload all configured resources', async () => {
      spyOn(service, 'preload').and.returnValue(Promise.resolve());
      await service.preloadAll();
      // Should preload 8 flag resources + 2 font resources = 10 total
      expect(service.preload).toHaveBeenCalledTimes(10);
    });

    it('should handle preload failures gracefully', async () => {
      spyOn(service, 'preload').and.returnValue(Promise.reject(new Error('Failed')));
      // Should not throw
      await expectAsync(service.preloadAll()).toBeResolved();
    });
  });

  describe('preload', () => {
    it('should preload an image resource', async () => {
      const mockImage = {
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        src: '',
      };
      spyOn(window, 'Image').and.returnValue(mockImage as unknown as HTMLImageElement);

      const preloadPromise = service.preload({
        url: 'test.svg',
        type: 'image',
        mimeType: 'image/svg+xml',
      });

      // Trigger onload
      mockImage.onload?.();
      await preloadPromise;

      expect(mockImage.src).toBe('test.svg');
    });

    it('should not preload the same URL twice', async () => {
      const mockImage = {
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        src: '',
      };
      spyOn(window, 'Image').and.returnValue(mockImage as unknown as HTMLImageElement);

      const resource = { url: 'test.svg', type: 'image' as const };

      // First preload
      const promise1 = service.preload(resource);
      mockImage.onload?.();
      await promise1;

      // Reset spy call count
      (window.Image as unknown as jasmine.Spy).calls.reset();

      // Second preload should skip
      await service.preload(resource);
      expect(window.Image).not.toHaveBeenCalled();
    });

    it('should handle image preload errors silently', async () => {
      const mockImage = {
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        src: '',
      };
      spyOn(window, 'Image').and.returnValue(mockImage as unknown as HTMLImageElement);

      const preloadPromise = service.preload({
        url: 'nonexistent.svg',
        type: 'image',
      });

      // Trigger onerror - the error is caught in the service's try/catch
      mockImage.onerror?.();

      // Should resolve (not reject) since errors are caught silently
      await expectAsync(preloadPromise).toBeResolved();

      // URL should NOT be added to preloaded set on failure
      expect(service.isPreloaded('nonexistent.svg')).toBeFalse();
    });

    it('should preload style resources via link element', async () => {
      const mockLink = {
        rel: '',
        href: '',
        as: '',
        type: '',
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      spyOn(document, 'createElement').and.returnValue(mockLink as unknown as HTMLLinkElement);
      spyOn(document.head, 'appendChild');

      const preloadPromise = service.preload({
        url: 'styles.css',
        type: 'style',
        mimeType: 'text/css',
      });

      mockLink.onload?.();
      await preloadPromise;

      expect(mockLink.rel).toBe('preload');
      expect(mockLink.href).toBe('styles.css');
      expect(mockLink.as).toBe('style');
      expect(document.head.appendChild).toHaveBeenCalled();
    });

    it('should preload font resources using FontFace API', async () => {
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockFont = { load: jasmine.createSpy('load').and.returnValue(Promise.resolve()) };

      spyOn(window, 'fetch').and.returnValue(Promise.resolve({
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      } as Response));
      spyOn(window, 'FontFace').and.returnValue(mockFont as unknown as FontFace);

      await service.preload({
        url: 'font.ttf',
        type: 'font',
        mimeType: 'font/ttf',
      });

      expect(window.fetch).toHaveBeenCalledWith('font.ttf');
      expect(window.FontFace).toHaveBeenCalled();
      expect(mockFont.load).toHaveBeenCalled();
      expect(service.isPreloaded('font.ttf')).toBeTrue();
    });

    it('should fall back to link preload when FontFace is not available', async () => {
      const originalFontFace = window.FontFace;
      // @ts-expect-error - Temporarily remove FontFace
      delete window.FontFace;

      const mockLink = {
        rel: '',
        href: '',
        as: '',
        type: '',
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      spyOn(document, 'createElement').and.returnValue(mockLink as unknown as HTMLLinkElement);
      spyOn(document.head, 'appendChild');

      const preloadPromise = service.preload({
        url: 'font.woff2',
        type: 'font',
        mimeType: 'font/woff2',
      });

      mockLink.onload?.();
      await preloadPromise;

      expect(mockLink.as).toBe('font');
      expect(document.head.appendChild).toHaveBeenCalled();

      // Restore FontFace
      window.FontFace = originalFontFace;
    });

    it('should handle link preload errors gracefully', async () => {
      const mockLink = {
        rel: '',
        href: '',
        as: '',
        type: '',
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      spyOn(document, 'createElement').and.returnValue(mockLink as unknown as HTMLLinkElement);
      spyOn(document.head, 'appendChild');

      const preloadPromise = service.preload({
        url: 'missing.css',
        type: 'style',
      });

      // Trigger onerror
      mockLink.onerror?.();
      await preloadPromise;

      // Should still resolve (onerror resolves, doesn't reject)
      expect(document.head.appendChild).toHaveBeenCalled();
    });

    it('should preload script resources via link element', async () => {
      const mockLink = {
        rel: '',
        href: '',
        as: '',
        type: '',
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      spyOn(document, 'createElement').and.returnValue(mockLink as unknown as HTMLLinkElement);
      spyOn(document.head, 'appendChild');

      const preloadPromise = service.preload({
        url: 'script.js',
        type: 'script',
      });

      mockLink.onload?.();
      await preloadPromise;

      expect(mockLink.as).toBe('script');
    });
  });

  describe('isPreloaded', () => {
    it('should return false for non-preloaded URLs', () => {
      expect(service.isPreloaded('unknown.svg')).toBeFalse();
    });

    it('should return true for preloaded URLs', async () => {
      const mockImage = {
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        src: '',
      };
      spyOn(window, 'Image').and.returnValue(mockImage as unknown as HTMLImageElement);

      const promise = service.preload({ url: 'test.svg', type: 'image' });
      mockImage.onload?.();
      await promise;

      expect(service.isPreloaded('test.svg')).toBeTrue();
    });
  });
});
