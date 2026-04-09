import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuShareComponent } from './menu-share.component';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { provideShareButtonsOptions, withConfig } from 'ngx-sharebuttons';
import { shareIcons } from 'ngx-sharebuttons/icons';

describe('MenuShareComponent', () => {
  let component: MenuShareComponent;
  let fixture: ComponentFixture<MenuShareComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuShareComponent, getTranslocoModule()],
      providers: [
        provideShareButtonsOptions(
          shareIcons(),
          withConfig({ debug: false }),
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuShareComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set currentUrl on init', () => {
    expect(component.currentUrl()).toContain('http');
  });

  it('should have share buttons defined', () => {
    expect(component.shareButtons.length).toBeGreaterThan(0);
    expect(component.shareButtons[0].type).toBe('copy');
  });

  it('should detect native share support', () => {
    expect(typeof component.canNativeShare).toBe('boolean');
  });

  describe('nativeShare', () => {
    it('should call navigator.share when available', async () => {
      const shareSpy = spyOn(navigator, 'share').and.returnValue(Promise.resolve());
      component.nativeShare();
      expect(shareSpy).toHaveBeenCalledWith({
        title: component.pageTitle(),
        url: component.currentUrl(),
      });
    });

    it('should handle navigator.share rejection gracefully', async () => {
      spyOn(navigator, 'share').and.returnValue(Promise.reject(new Error('cancelled')));
      expect(() => component.nativeShare()).not.toThrow();
    });
  });

  describe('downloadQrCode', () => {
    it('should do nothing when no canvas is found', () => {
      spyOn(document, 'querySelector').and.returnValue(null);
      expect(() => component.downloadQrCode()).not.toThrow();
    });

    it('should create a download link from the canvas', () => {
      const mockCanvas = document.createElement('canvas');
      spyOn(document, 'querySelector').and.returnValue(mockCanvas);
      const createElementSpy = spyOn(document, 'createElement').and.callFake((tag: string) => {
        const el = document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
        if (tag === 'a') {
          // Prevent actual navigation
          spyOn(el as HTMLAnchorElement, 'click');
        }
        return el;
      });

      component.downloadQrCode();

      expect(createElementSpy).toHaveBeenCalledWith('a');
    });
  });
});
