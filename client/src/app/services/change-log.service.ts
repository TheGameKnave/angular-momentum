import { DestroyRef, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ENVIRONMENT } from 'src/environments/environment';
import { catchError, map, of, switchMap, timer, tap, merge, Subject } from 'rxjs';
import { ChangeImpact } from '@app/models/data.model';
import packageJson from 'src/../package.json';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface ChangeLogResponse {
  version: string;
  date: string;
  description: string;
  changes: string[];
}

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

  /** Manually refresh the changelog if needed */
  refresh(): void {
    this.manualRefresh$.next();
  }

  /** Fetch and update signals */
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

  // istanbul ignore next // smh my damn head
  public getCurrentVersion() {
    return packageJson.version;
  }
  /** Semver diff helper */
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

/** GraphQL query for changelog data */
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
