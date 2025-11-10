import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Socket } from 'ngx-socket-io';
import { ENVIRONMENT } from 'src/environments/environment';
import { catchError, map, Observable, of, take, tap } from 'rxjs';
import equal from 'fast-deep-equal';
import { ArbitraryFeatures, FeatureFlagResponse } from '@app/models/data.model';

/**
 * Type representing all possible feature flag keys.
 */
export type FeatureFlagKeys = keyof FeatureFlagResponse;

/**
 * Service for managing feature flags across the application.
 *
 * Provides functionality to fetch, update, and monitor feature flags using GraphQL.
 * Supports real-time updates via WebSocket for synchronized flag changes across clients.
 *
 * Features:
 * - GraphQL-based flag retrieval and updates
 * - WebSocket support for real-time flag synchronization
 * - Signal-based state management for reactive updates
 * - Deep equality checking to prevent unnecessary updates
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  features = signal<Partial<Record<FeatureFlagKeys, boolean>>>({});

  constructor(
    protected readonly http: HttpClient,
    protected readonly socket: Socket
  ) {
    // Listen for WebSocket updates
    this.socket.on('update-feature-flags', (update: FeatureFlagResponse) => {
      const newFeatures: ArbitraryFeatures = { ...this.features(), ...update };
      this.features.set(newFeatures);
    });
  }

  /**
   * Fetch all feature flags from the backend using GraphQL.
   * Updates the features signal with the retrieved flags.
   * @returns Observable of feature flag key-value pairs
   */
  getFeatureFlags(): Observable<FeatureFlagResponse> {
    const query = getFeatureFlagsQuery();
    return this.http.post<{ data: { featureFlags: { key: FeatureFlagKeys; value: boolean }[] } }>(ENVIRONMENT.baseUrl + '/api', { query }).pipe(
      map((response) => {
        const featureFlags = response.data.featureFlags.reduce((acc, flag) => {
          acc[flag.key] = flag.value;
          return acc;
        }, {} as FeatureFlagResponse);
        return featureFlags;
      }),
      tap((featureFlags) => this.features.set(featureFlags)),
      catchError((error: unknown) => {
        /**/console.error('Error getting feature flags:', error);
        // Return a default value or an empty observable
        return of({} as FeatureFlagResponse);
      })
    );
  }

  /**
   * Update a feature flag both locally and on the backend.
   * Sends updates via GraphQL.
   * Uses deep equality checking to prevent unnecessary updates and backend calls.
   * @param feature - The feature flag key to update
   * @param value - The new boolean value for the feature flag
   */
  setFeature<T extends FeatureFlagKeys>(feature: T, value: boolean) {
    const newFeatures = { ...this.features(), [feature]: value };
    if(!equal(newFeatures,this.features())){
      this.features.set(newFeatures);
    
      // Notify backend of the updated flag using GraphQL request
      const mutation = updateFeatureFlagMutation();
      this.http.post(ENVIRONMENT.baseUrl + '/api', {
        query: mutation,
        variables: { key: feature, value },
      }).pipe(take(1)).subscribe();
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

/**
 * Generate GraphQL query for fetching all feature flags.
 * @returns GraphQL query string
 */
export function getFeatureFlagsQuery() {
  return `
    query GetFeatureFlags {
      featureFlags {
        key
        value
      }
    }
  `;
}

/**
 * Generate GraphQL mutation for updating a single feature flag.
 * @returns GraphQL mutation string
 */
export function updateFeatureFlagMutation() {
  return `
    mutation UpdateFeatureFlag($key: String!, $value: Boolean!) {
      updateFeatureFlag(key: $key, value: $value) {
        key
        value
      }
    }
  `;
}
