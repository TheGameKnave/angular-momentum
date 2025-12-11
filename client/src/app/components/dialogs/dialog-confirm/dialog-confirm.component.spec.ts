import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DialogConfirmComponent } from './dialog-confirm.component';
import { ConfirmDialogService, ConfirmDialogOptions } from '@app/services/confirm-dialog.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';

describe('DialogConfirmComponent', () => {
  let component: DialogConfirmComponent;
  let fixture: ComponentFixture<DialogConfirmComponent>;
  let mockDialogService: jasmine.SpyObj<ConfirmDialogService>;

  const mockOptions: ConfirmDialogOptions = {
    title: 'Test Title',
    message: 'Test Message',
    icon: 'pi pi-trash',
    iconColor: 'var(--red-500)',
    confirmLabel: 'Confirm',
    confirmSeverity: 'danger',
    onConfirm: () => Promise.resolve(),
  };

  beforeEach(async () => {
    mockDialogService = jasmine.createSpyObj('ConfirmDialogService', [
      'confirm',
      'dismiss',
    ], {
      visible: signal(false), // Start hidden to avoid CDK overlay issues before ViewChild is ready
      loading: signal(false),
      error: signal<string | null>(null),
      options: signal<ConfirmDialogOptions | null>(mockOptions),
    });

    await TestBed.configureTestingModule({
      imports: [
        DialogConfirmComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: ConfirmDialogService, useValue: mockDialogService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DialogConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call dismiss on cancel', () => {
    component.onCancel();

    expect(mockDialogService.dismiss).toHaveBeenCalled();
  });

  it('should call confirm on confirm', async () => {
    mockDialogService.confirm.and.returnValue(Promise.resolve());

    await component.onConfirm();

    expect(mockDialogService.confirm).toHaveBeenCalled();
  });

  it('should expose visible signal from service', () => {
    expect(component.visible()).toBe(false);
  });

  it('should expose loading signal from service', () => {
    expect(component.loading()).toBe(false);
  });

  it('should expose error signal from service', () => {
    expect(component.error()).toBeNull();
  });

  it('should expose options signal from service', () => {
    expect(component.options()).toEqual(mockOptions);
  });
});
