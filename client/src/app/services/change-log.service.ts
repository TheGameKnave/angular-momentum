import { DestroyRef, Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ENVIRONMENT } from 'src/environments/environment';
import { catchError, map, of, switchMap, timer, tap, merge, Subject } from 'rxjs';
import { ChangeImpact } from '@app/models/data.model';
import packageJson from 'src/../package.json';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CHANGELOG_CONFIG } from '@app/constants/service.constants';
import { semverDiff } from '@app/helpers/semver.helper';

/**
 * Represents a single changelog entry with version information and changes.
 * Used for displaying application version history to users.
 */
export interface ChangeLogResponse {
  version: string;
  date: string;
  description: string;
  changes: string[];
}

/**
 * Service for managing application changelog data.
 *
 * Fetches changelog from backend via REST API and provides version comparison utilities.
 * Automatically refreshes changelog data every hour, with support for manual refresh.
 *
 * Features:
 * - Automatic hourly refresh of changelog data
 * - Manual refresh capability
 * - Semantic version comparison (major, minor, patch)
 * - Version delta calculation
 * - Signal-based reactive state management
 */
@Injectable({ providedIn: 'root' })
export class ChangeLogService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly changes = signal<ChangeLogResponse[]>([]);
  readonly appVersion = signal<string>('');
  readonly appDiff = signal<{ impact: ChangeImpact; delta: number }>({
    impact: 'patch',
    delta: 0,
  });

  /** Dev-only override for current version (used for testing update dialog) */
  readonly devVersionOverride = signal<string | null>(null);

  /** Previous version captured before update (for update dialog display) */
  readonly previousVersion = signal<string | null>(null);

  private readonly manualRefresh$ = new Subject<void>();
  private readonly refreshIntervalMs = CHANGELOG_CONFIG.REFRESH_INTERVAL_MS;
  private readonly refresh$ = merge(
    timer(0, this.refreshIntervalMs),
    this.manualRefresh$,
  );

  constructor() {
    // relaxed background auto-refresh
    this.refresh$
      .pipe(
        switchMap(() => this.getChangeLogs()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /**
   * Manually refresh the changelog.
   * Triggers an immediate fetch of changelog data from the backend.
   * @returns Promise that resolves when the refresh completes
   */
  refresh(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.getChangeLogs().subscribe({
        next: () => resolve(),
        error: () => resolve(), // Resolve even on error to avoid blocking
      });
    });
  }

  /**
   * Fetches changelog data from the backend REST API and updates all signals.
   * Retrieves version history, calculates semantic version differences, and updates the changes, appVersion, and appDiff signals.
   * Automatically handles errors by returning an empty observable.
   * @returns Observable that emits when changelog data has been fetched and processed
   */
  private getChangeLogs() {
    return this.http
      .get<ChangeLogResponse[]>(ENVIRONMENT.baseUrl + '/api/changelog')
      .pipe(
        tap((changeLogArr) => {
          this.changes.set(changeLogArr);
          this.appVersion.set(changeLogArr[0].version);
          const { impact, delta, direction } = semverDiff(
            this.getCurrentVersion(),
            changeLogArr[0].version,
          );
          // Map 'none' to 'patch' for backwards compatibility
          const mappedImpact: ChangeImpact = impact === 'none' ? 'patch' : impact;
          // Only show update indicator when behind, not when ahead
          const effectiveDelta = direction === 'behind' ? delta : 0;
          this.appDiff.set({ impact: mappedImpact, delta: effectiveDelta });
        }),
        catchError((error: unknown) => {
          console.error('Error fetching change log:', error);
          return of();
        }),
        map(() => void 0),
      );
  }

  /**
   * Get current application version from package.json.
   * In dev mode, can be overridden via devVersionOverride signal.
   * @returns Current version string (e.g., '1.2.3')
   */
  // istanbul ignore next - returns static package.json version, mocked in tests
  public getCurrentVersion(): string {
    return this.devVersionOverride() ?? packageJson.version;
  }

  /**
   * Capture the current version as the "previous" version before an update.
   * Called when an update is detected but before the new code is activated.
   */
  public capturePreviousVersion(): void {
    this.previousVersion.set(this.getCurrentVersion());
  }

  /**
   * Clear the previous version after update dialog is dismissed.
   */
  public clearPreviousVersion(): void {
    this.previousVersion.set(null);
  }
}
