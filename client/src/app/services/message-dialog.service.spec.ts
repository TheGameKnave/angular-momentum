import { TestBed } from '@angular/core/testing';
import { MessageDialogService } from './message-dialog.service';

describe('MessageDialogService', () => {
  let service: MessageDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageDialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start hidden with no options', () => {
    expect(service.visible()).toBe(false);
    expect(service.options()).toBeNull();
  });

  describe('show', () => {
    it('should display the message with info defaults', () => {
      service.show({ message: 'test.Message' });

      expect(service.visible()).toBe(true);
      expect(service.options()).toEqual(jasmine.objectContaining({
        message: 'test.Message',
        severity: 'info',
        title: 'Information',
        icon: 'pi pi-info-circle',
        iconColor: 'var(--p-blue-500)',
      }));
    });

    it('should apply error severity defaults', () => {
      service.show({ message: 'test.Message', severity: 'error' });

      expect(service.options()).toEqual(jasmine.objectContaining({
        severity: 'error',
        title: 'Error',
        icon: 'pi pi-times-circle',
        iconColor: 'var(--p-red-500)',
      }));
    });

    it('should apply warn severity defaults', () => {
      service.show({ message: 'test.Message', severity: 'warn' });

      expect(service.options()).toEqual(jasmine.objectContaining({
        severity: 'warn',
        title: 'Warning',
        icon: 'pi pi-exclamation-triangle',
        iconColor: 'var(--p-orange-500)',
      }));
    });

    it('should let explicit options override severity defaults', () => {
      service.show({
        message: 'test.Message',
        severity: 'error',
        title: 'custom.Title',
        icon: 'pi pi-bolt',
        iconColor: 'var(--green-500)',
        buttonLabel: 'custom.Close',
      });

      expect(service.options()).toEqual(jasmine.objectContaining({
        title: 'custom.Title',
        icon: 'pi pi-bolt',
        iconColor: 'var(--green-500)',
        buttonLabel: 'custom.Close',
      }));
    });

    it('should queue messages shown while one is visible', () => {
      service.show({ message: 'test.First' });
      service.show({ message: 'test.Second' });

      // Still showing the first message
      expect(service.options()?.message).toBe('test.First');
    });
  });

  describe('convenience methods', () => {
    it('showError should show with error severity', () => {
      service.showError('test.Message');

      expect(service.options()?.severity).toBe('error');
    });

    it('showWarning should show with warn severity', () => {
      service.showWarning('test.Message');

      expect(service.options()?.severity).toBe('warn');
    });

    it('showInfo should show with info severity', () => {
      service.showInfo('test.Message');

      expect(service.options()?.severity).toBe('info');
    });

    it('should pass overrides through', () => {
      service.showError('test.Message', { title: 'custom.Title' });

      expect(service.options()?.title).toBe('custom.Title');
    });
  });

  describe('dismiss', () => {
    it('should hide the dialog and clear options', () => {
      service.show({ message: 'test.Message' });

      service.dismiss();

      expect(service.visible()).toBe(false);
      expect(service.options()).toBeNull();
    });

    it('should advance to the next queued message', () => {
      service.show({ message: 'test.First' });
      service.show({ message: 'test.Second' });

      service.dismiss();

      // Second message displays without the dialog ever hiding
      expect(service.visible()).toBe(true);
      expect(service.options()?.message).toBe('test.Second');

      service.dismiss();

      expect(service.visible()).toBe(false);
      expect(service.options()).toBeNull();
    });

    it('should fire onClose for the dismissed message only', () => {
      const firstClose = jasmine.createSpy('firstClose');
      const secondClose = jasmine.createSpy('secondClose');
      service.show({ message: 'test.First', onClose: firstClose });
      service.show({ message: 'test.Second', onClose: secondClose });

      service.dismiss();

      expect(firstClose).toHaveBeenCalled();
      expect(secondClose).not.toHaveBeenCalled();

      service.dismiss();

      expect(secondClose).toHaveBeenCalled();
    });

    it('should tolerate dismiss with nothing shown', () => {
      expect(() => service.dismiss()).not.toThrow();
      expect(service.visible()).toBe(false);
    });
  });
});
