import { TestBed } from '@angular/core/testing';
import { ConfirmDialogService, ConfirmDialogOptions } from './confirm-dialog.service';

describe('ConfirmDialogService', () => {
  let service: ConfirmDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfirmDialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with visible false', () => {
    expect(service.visible()).toBe(false);
  });

  it('should start with loading false', () => {
    expect(service.loading()).toBe(false);
  });

  it('should start with error null', () => {
    expect(service.error()).toBeNull();
  });

  it('should start with options null', () => {
    expect(service.options()).toBeNull();
  });

  describe('show', () => {
    it('should set visible to true', () => {
      const options: ConfirmDialogOptions = {
        title: 'Test Title',
        message: 'Test Message',
        onConfirm: () => Promise.resolve(),
      };

      service.show(options);

      expect(service.visible()).toBe(true);
    });

    it('should store the options', () => {
      const options: ConfirmDialogOptions = {
        title: 'Test Title',
        message: 'Test Message',
        icon: 'pi pi-trash',
        iconColor: 'var(--red-500)',
        confirmLabel: 'Delete',
        confirmIcon: 'pi pi-trash',
        confirmSeverity: 'danger',
        cancelLabel: 'Cancel',
        onConfirm: () => Promise.resolve(),
      };

      service.show(options);

      expect(service.options()).toEqual(options);
    });

    it('should clear any previous error', () => {
      service['error'].set('Previous error');
      const options: ConfirmDialogOptions = {
        title: 'Test Title',
        onConfirm: () => Promise.resolve(),
      };

      service.show(options);

      expect(service.error()).toBeNull();
    });
  });

  describe('confirm', () => {
    it('should set loading to true during operation', async () => {
      let loadingDuringCallback = false;
      const options: ConfirmDialogOptions = {
        title: 'Test',
        onConfirm: async () => {
          loadingDuringCallback = service.loading();
        },
      };

      service.show(options);
      await service.confirm();

      expect(loadingDuringCallback).toBe(true);
    });

    it('should set loading to false after operation', async () => {
      const options: ConfirmDialogOptions = {
        title: 'Test',
        onConfirm: () => Promise.resolve(),
      };

      service.show(options);
      await service.confirm();

      expect(service.loading()).toBe(false);
    });

    it('should set visible to false on success', async () => {
      const options: ConfirmDialogOptions = {
        title: 'Test',
        onConfirm: () => Promise.resolve(),
      };

      service.show(options);
      await service.confirm();

      expect(service.visible()).toBe(false);
    });

    it('should clear options on success', async () => {
      const options: ConfirmDialogOptions = {
        title: 'Test',
        onConfirm: () => Promise.resolve(),
      };

      service.show(options);
      await service.confirm();

      expect(service.options()).toBeNull();
    });

    it('should call onConfirm callback', async () => {
      const callback = jasmine.createSpy('callback').and.returnValue(Promise.resolve());
      const options: ConfirmDialogOptions = {
        title: 'Test',
        onConfirm: callback,
      };

      service.show(options);
      await service.confirm();

      expect(callback).toHaveBeenCalled();
    });

    it('should set error on failure', async () => {
      const options: ConfirmDialogOptions = {
        title: 'Test',
        onConfirm: () => Promise.reject(new Error('Test error')),
      };

      service.show(options);
      await service.confirm();

      expect(service.error()).toBe('Test error');
    });

    it('should keep dialog visible on error', async () => {
      const options: ConfirmDialogOptions = {
        title: 'Test',
        onConfirm: () => Promise.reject(new Error('Test error')),
      };

      service.show(options);
      await service.confirm();

      expect(service.visible()).toBe(true);
    });

    it('should set loading to false even if callback throws', async () => {
      const options: ConfirmDialogOptions = {
        title: 'Test',
        onConfirm: () => Promise.reject(new Error('Test error')),
      };

      service.show(options);
      await service.confirm();

      expect(service.loading()).toBe(false);
    });

    it('should do nothing if no options are set', async () => {
      await service.confirm();

      expect(service.visible()).toBe(false);
      expect(service.loading()).toBe(false);
    });
  });

  describe('dismiss', () => {
    it('should set visible to false', () => {
      const options: ConfirmDialogOptions = {
        title: 'Test',
        onConfirm: () => Promise.resolve(),
      };
      service.show(options);

      service.dismiss();

      expect(service.visible()).toBe(false);
    });

    it('should clear error', () => {
      service['error'].set('Some error');

      service.dismiss();

      expect(service.error()).toBeNull();
    });

    it('should clear options', () => {
      const options: ConfirmDialogOptions = {
        title: 'Test',
        onConfirm: () => Promise.resolve(),
      };
      service.show(options);

      service.dismiss();

      expect(service.options()).toBeNull();
    });

    it('should prevent callback from being executed after dismiss', async () => {
      const callback = jasmine.createSpy('callback').and.returnValue(Promise.resolve());
      const options: ConfirmDialogOptions = {
        title: 'Test',
        onConfirm: callback,
      };
      service.show(options);
      service.dismiss();

      // Confirm should do nothing since options were cleared
      await service.confirm();

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
