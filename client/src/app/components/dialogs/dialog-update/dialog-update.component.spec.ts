import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DialogUpdateComponent } from './dialog-update.component';
import { ChangeLogService } from '@app/services/change-log.service';
import { UpdateDialogService } from '@app/services/update-dialog.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { ChangeImpact } from '@app/models/data.model';

describe('DialogUpdateComponent', () => {
  let component: DialogUpdateComponent;
  let fixture: ComponentFixture<DialogUpdateComponent>;
  let mockChangeLogService: jasmine.SpyObj<ChangeLogService>;
  let mockUpdateDialogService: jasmine.SpyObj<UpdateDialogService>;

  beforeEach(async () => {
    mockChangeLogService = jasmine.createSpyObj('ChangeLogService', ['getCurrentVersion'], {
      appVersion: signal('1.0.1'),
      appDiff: signal<{ impact: ChangeImpact; delta: number }>({ impact: 'patch', delta: 1 }),
      changes: signal([{
        version: '1.0.1',
        date: '2025-01-01',
        description: 'Bug fixes and improvements',
        changes: ['Fixed a bug', 'Improved performance'],
      }]),
    });
    mockChangeLogService.getCurrentVersion.and.returnValue('1.0.0');

    mockUpdateDialogService = jasmine.createSpyObj('UpdateDialogService', [
      'show',
      'confirm',
      'dismiss',
    ], {
      visible: signal(false), // Start hidden to avoid CDK overlay issues before ViewChild is ready
    });

    await TestBed.configureTestingModule({
      imports: [
        DialogUpdateComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: ChangeLogService, useValue: mockChangeLogService },
        { provide: UpdateDialogService, useValue: mockUpdateDialogService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DialogUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show current and latest version', () => {
    expect(component.currentVersion()).toBe('1.0.0');
    expect(component.latestVersion()).toBe('1.0.1');
  });

  it('should identify patch updates as non-required', () => {
    expect(component.isRequiredUpdate()).toBeFalse();
  });

  it('should identify major updates as required', () => {
    (mockChangeLogService.appDiff as any).set({ impact: 'major', delta: 1 });
    fixture.detectChanges();

    expect(component.isRequiredUpdate()).toBeTrue();
  });

  it('should identify minor updates as required', () => {
    (mockChangeLogService.appDiff as any).set({ impact: 'minor', delta: 1 });
    fixture.detectChanges();

    expect(component.isRequiredUpdate()).toBeTrue();
  });

  it('should call confirm on update', () => {
    component.onUpdate();

    expect(mockUpdateDialogService.confirm).toHaveBeenCalled();
  });

  it('should dismiss on later for patches', () => {
    component.onLater();

    expect(mockUpdateDialogService.dismiss).toHaveBeenCalled();
  });

  it('should not dismiss for major updates', () => {
    (mockChangeLogService.appDiff as any).set({ impact: 'major', delta: 1 });
    fixture.detectChanges();

    component.onLater();

    expect(mockUpdateDialogService.dismiss).not.toHaveBeenCalled();
  });

  it('should compute changelog entries newer than current version', () => {
    const entries = component.changelogEntries();

    expect(entries.length).toBe(1);
    expect(entries[0].version).toBe('1.0.1');
  });

  it('should return empty changelog entries when at latest version', () => {
    mockChangeLogService.getCurrentVersion.and.returnValue('1.0.1');

    const entries = component.changelogEntries();

    expect(entries.length).toBe(0);
  });

  it('should filter out changelog entries older than current version', () => {
    // Mock changelog with entries older than current
    (mockChangeLogService.changes as any).set([
      { version: '1.0.1', date: '2025-01-02', description: 'Newer', changes: [] },
      { version: '1.0.0', date: '2025-01-01', description: 'Current', changes: [] },
      { version: '0.9.0', date: '2024-12-01', description: 'Older', changes: [] },
    ]);
    mockChangeLogService.getCurrentVersion.and.returnValue('1.0.0');

    const entries = component.changelogEntries();

    // Should only include 1.0.1 (newer than 1.0.0)
    expect(entries.length).toBe(1);
    expect(entries[0].version).toBe('1.0.1');
  });

  it('should handle comparing versions with equal major but lower minor', () => {
    // This tests the isVersionNewer branch where v1[i] < v2[i] in a later position
    // When checking 1.0.5 against current 1.1.0: major equal (1==1), then minor 0 < 1, returns false
    (mockChangeLogService.changes as any).set([
      { version: '1.0.5', date: '2025-01-01', description: 'Old minor', changes: [] },
    ]);
    mockChangeLogService.getCurrentVersion.and.returnValue('1.1.0');

    const entries = component.changelogEntries();

    // 1.0.5 is NOT newer than 1.1.0, so entries should be empty
    expect(entries.length).toBe(0);
  });
});
