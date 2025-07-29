import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Socket } from 'ngx-socket-io';
import { ENVIRONMENT } from 'src/environments/environment';
import { catchError, map, Observable, of, take, tap } from 'rxjs';
import equal from 'fast-deep-equal';
import { ComponentListService } from '@app/services/component-list.service';
import { ArbitraryFeatures, FeatureFlagResponse } from '@app/models/data.model';

type _FeatureFlagKeys = keyof FeatureFlagResponse;
export type FeatureFlagKeys = {
  [K in _FeatureFlagKeys]: K;
}[_FeatureFlagKeys];

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  http = inject(HttpClient);
  socket = inject(Socket);

  features = signal<Record<string, boolean>>({});

  constructor(
    private componentListService: ComponentListService,
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
  setFeature(feature: FeatureFlagKeys, value: boolean) {
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
  getFeature(feature: FeatureFlagKeys): boolean {
    return this.features()[feature] ?? feature === 'Features';
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
