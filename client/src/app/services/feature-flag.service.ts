import { DestroyRef, inject, Injectable, makeStateKey, PLATFORM_ID, signal, TransferState } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Socket } from 'ngx-socket-io';
import { ENVIRONMENT } from 'src/environments/environment';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import equal from 'fast-deep-equal';
import { ArbitraryFeatures, FeatureFlagResponse } from '@app/models/data.model';

const FEATURE_FLAGS_KEY = makeStateKey<FeatureFlagResponse>('featureFlags');

/**
 * Type representing all possible feature flag keys.
 */
export type FeatureFlagKeys = keyof FeatureFlagResponse;

/**
 * Service for managing feature flags across the application.
 *
 * Provides functionality to fetch, update, and monitor feature flags using REST API.
 * Supports real-time updates via WebSocket for synchronized flag changes across clients.
 *
 * Features:
 * - REST API-based flag retrieval and updates
 * - WebSocket support for real-time flag synchronization
 * - Signal-based state management for reactive updates
 * - Deep equality checking to prevent unnecessary updates
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  protected readonly http = inject(HttpClient);
  protected readonly socket = inject(Socket, { optional: true }); // Optional for SSR
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);

  features = signal<Partial<Record<FeatureFlagKeys, boolean>>>({});
  /** Indicates whether feature flags have been loaded (for fail-closed behavior) */
  loaded = signal(false);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Check TransferState first (for SSR hydration)
    if (isPlatformBrowser(this.platformId) && this.transferState.hasKey(FEATURE_FLAGS_KEY)) {
      const flags = this.transferState.get(FEATURE_FLAGS_KEY, {} as FeatureFlagResponse);
      this.features.set(flags);
      this.loaded.set(true);
      this.transferState.remove(FEATURE_FLAGS_KEY);
    }

    // Listen for WebSocket updates (browser only)
    if (isPlatformBrowser(this.platformId) && this.socket) {
      this.socket.on('update-feature-flags', (update: FeatureFlagResponse) => {
        const newFeatures: ArbitraryFeatures = { ...this.features(), ...update };
        this.features.set(newFeatures);
      });
    }
  }

  /**
   * Fetch all feature flags from the backend using REST API.
   * Updates the features signal with the retrieved flags.
   * Stores in TransferState on server for SSR hydration.
   * @returns Observable of feature flag key-value pairs
   */
  getFeatureFlags(): Observable<FeatureFlagResponse> {
    return this.http.get<{ key: FeatureFlagKeys; value: boolean }[]>(ENVIRONMENT.baseUrl + '/api/feature-flags').pipe(
      map((flags) => {
        const featureFlags = flags.reduce((acc, flag) => {
          acc[flag.key] = flag.value;
          return acc;
        }, {} as FeatureFlagResponse);
        return featureFlags;
      }),
      tap((featureFlags) => {
        this.features.set(featureFlags);
        this.loaded.set(true);

        // Store in TransferState on server for SSR hydration
        if (isPlatformServer(this.platformId)) {
          this.transferState.set(FEATURE_FLAGS_KEY, featureFlags);
        }
      }),
      catchError((error: unknown) => {
        /**/console.error('Error getting feature flags:', error);
        // Return a default value or an empty observable
        return of({} as FeatureFlagResponse);
      })
    );
  }

  /**
   * Update a feature flag both locally and on the backend.
   * Sends updates via REST API.
   * Uses deep equality checking to prevent unnecessary updates and backend calls.
   * @param feature - The feature flag key to update
   * @param value - The new boolean value for the feature flag
   */
  setFeature<T extends FeatureFlagKeys>(feature: T, value: boolean) {
    const newFeatures = { ...this.features(), [feature]: value };
    if(!equal(newFeatures,this.features())){
      this.features.set(newFeatures);

      // Notify backend of the updated flag using REST API
      this.http.put(ENVIRONMENT.baseUrl + `/api/feature-flags/${feature}`, { value })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
  }

  /**
   * Get the value of a specific feature flag.
   * Returns true if the flag is not explicitly set to false (defaults to enabled).
   * @param feature - The feature flag key to retrieve
   * @returns Boolean value of the feature flag (defaults to true if not set)
   */
  getFeature<T extends FeatureFlagKeys>(feature: T): boolean {
    return this.features()[feature] !== false;
  }

}
