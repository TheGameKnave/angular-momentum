import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DialogMessageComponent } from './dialog-message.component';
import { MessageDialogService, ResolvedMessageDialogOptions } from '@app/services/message-dialog.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';

describe('DialogMessageComponent', () => {
  let component: DialogMessageComponent;
  let fixture: ComponentFixture<DialogMessageComponent>;
  let mockDialogService: jasmine.SpyObj<MessageDialogService>;

  const mockOptions: ResolvedMessageDialogOptions = {
    message: 'test.Message',
    severity: 'error',
    title: 'Error',
    icon: 'pi pi-times-circle',
    iconColor: 'var(--p-red-500)',
  };

  beforeEach(async () => {
    mockDialogService = jasmine.createSpyObj('MessageDialogService', [
      'dismiss',
    ], {
      visible: signal(false), // Start hidden to avoid CDK overlay issues before ViewChild is ready
      options: signal<ResolvedMessageDialogOptions | null>(mockOptions),
    });

    await TestBed.configureTestingModule({
      imports: [
        DialogMessageComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: MessageDialogService, useValue: mockDialogService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DialogMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose visibility from the service', () => {
    expect(component.visible()).toBe(false);
  });

  it('should expose options from the service', () => {
    expect(component.options()).toEqual(mockOptions);
  });

  it('should dismiss via the service on OK', () => {
    component.onOk();

    expect(mockDialogService.dismiss).toHaveBeenCalled();
  });
});
