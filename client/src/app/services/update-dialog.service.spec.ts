import { TestBed } from '@angular/core/testing';
import { UpdateDialogService } from './update-dialog.service';

describe('UpdateDialogService', () => {
  let service: UpdateDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UpdateDialogService]
    });
    service = TestBed.inject(UpdateDialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with visible false', () => {
    expect(service.visible()).toBeFalse();
  });

  it('should set visible to true when show is called', () => {
    service.show();

    expect(service.visible()).toBeTrue();
  });

  it('should resolve true when confirm is called', async () => {
    const promise = service.show();

    service.confirm();

    const result = await promise;
    expect(result).toBeTrue();
    expect(service.visible()).toBeFalse();
  });

  it('should resolve false when dismiss is called', async () => {
    const promise = service.show();

    service.dismiss();

    const result = await promise;
    expect(result).toBeFalse();
    expect(service.visible()).toBeFalse();
  });

  it('should handle multiple show/confirm cycles', async () => {
    // First cycle
    const promise1 = service.show();
    service.confirm();
    const result1 = await promise1;
    expect(result1).toBeTrue();

    // Second cycle
    const promise2 = service.show();
    service.dismiss();
    const result2 = await promise2;
    expect(result2).toBeFalse();
  });
});
