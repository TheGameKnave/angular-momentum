import { DestroyRef, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ENVIRONMENT } from 'src/environments/environment';
import { catchError, map, of, switchMap, timer, tap, merge, Subject } from 'rxjs';
import { ChangeImpact } from '@app/models/data.model';
import packageJson from 'src/../package.json';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
 * Fetches changelog from backend via GraphQL and provides version comparison utilities.
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
  readonly changes = signal<ChangeLogResponse[]>([]);
  readonly appVersion = signal<string>('');
  readonly appDiff = signal<{ impact: ChangeImpact; delta: number }>({
    impact: 'patch',
    delta: 0,
  });

  private readonly manualRefresh$ = new Subject<void>();
  private readonly refreshIntervalMs = 1000 * 60 * 60; // 1 hour
  private readonly refresh$ = merge(
    timer(0, this.refreshIntervalMs),
    this.manualRefresh$,
  );

  constructor(
    private readonly http: HttpClient,
    private readonly destroyRef: DestroyRef,
  ) {
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
   */
  refresh(): void {
    this.manualRefresh$.next();
  }

  /**
   * Fetches changelog data from the backend GraphQL API and updates all signals.
   * Retrieves version history, calculates semantic version differences, and updates the changes, appVersion, and appDiff signals.
   * Automatically handles errors by returning an empty observable.
   * @returns Observable that emits when changelog data has been fetched and processed
   */
  private getChangeLogs() {
    const query = getChangeLogQuery();
    return this.http
      .post<{ data: { changeLog: ChangeLogResponse[] } }>(
        ENVIRONMENT.baseUrl + '/api',
        { query },
      )
      .pipe(
        tap((res) => {
          const changeLogArr = res.data.changeLog;
          this.changes.set(changeLogArr);
          this.appVersion.set(changeLogArr[0].version);
          const { impact, delta } = this.calculateDiff(
            this.getCurrentVersion(),
            changeLogArr[0].version,
          );
          this.appDiff.set({ impact, delta });
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
   * @returns Current version string (e.g., '1.2.3')
   */
  // istanbul ignore next // smh my damn head
  public getCurrentVersion() {
    return packageJson.version;
  }
  /**
   * Calculate semantic version difference between current and latest versions.
   * Determines the impact level (major, minor, patch) and the numeric delta.
   * @param currentVersion - Current version string (e.g., '1.2.3')
   * @param latestVersion - Latest version string (e.g., '1.3.0')
   * @returns Object containing impact level and delta value
   */
  private calculateDiff(
    currentVersion: string,
    latestVersion: string
  ): { impact: ChangeImpact; delta: number } {
    const cur = currentVersion.split('.').map(Number);
    const latest = latestVersion.split('.').map(Number);

    let impact: ChangeImpact = 'patch';
    let delta = 0;

    if (latest[0] > cur[0]) {
      impact = 'major';
      delta = latest[0] - cur[0];
    } else if (latest[1] > cur[1]) {
      impact = 'minor';
      delta = latest[1] - cur[1];
    } else if (latest[2] > cur[2]) {
      delta = latest[2] - cur[2];
    }

    return { impact, delta };
  }

}

/**
 * Generates the GraphQL query string for fetching changelog data.
 * Requests version, date, description, and changes array for all changelog entries.
 * @returns GraphQL query string for the changeLog query
 */
export function getChangeLogQuery() {
  return `
    query GetChangeLog {
      changeLog {
        version
        date
        description
        changes
      }
    }
  `;
}
