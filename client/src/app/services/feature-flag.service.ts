import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Socket } from 'ngx-socket-io';
import { ENVIRONMENT } from 'src/environments/environment';
import { catchError, map, Observable, of, take, tap } from 'rxjs';
import equal from 'fast-deep-equal';
import { ArbitraryFeatures, FeatureFlagResponse } from '@app/models/data.model';

export type FeatureFlagKeys = keyof FeatureFlagResponse;

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
   */
  getFeature<T extends FeatureFlagKeys>(feature: T): boolean {
    return this.features()[feature] !== false;
  }

}
/**
 * graphQL queries to handle feature flags
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
