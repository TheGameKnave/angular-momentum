import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Socket } from 'ngx-socket-io';
import { ENVIRONMENT } from 'src/environments/environment';
import { catchError, map, Observable, of, tap } from 'rxjs';
import equal from 'fast-deep-equal';
import { ComponentListService, ComponentInstance } from '@app/services/component-list.service';

type ArbitraryFeatures = {
  // 'New Feature': boolean;
  // Add more arbitrary features here
};
type ComponentFlags = {
  [K in ComponentInstance['name']]: boolean;
}

type FeatureFlagResponse = ArbitraryFeatures & ComponentFlags;

type _FeatureFlagKeys = keyof FeatureFlagResponse;
export type FeatureFlagKeys = {
  [K in _FeatureFlagKeys]: K;
}[_FeatureFlagKeys];

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  http = inject(HttpClient);
  socket = inject(Socket);

  features = signal<Record<string, boolean>>({});

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
      catchError((error: HttpErrorResponse) => {
        /**/console.error('Error getting feature flags:', error);
        // Return a default value or an empty observable
        return of({} as FeatureFlagResponse);
      })
    );
  }
  constructor(
    private componentListService: ComponentListService,
  ) {
    // Listen for WebSocket updates
    this.socket.on('update-feature-flags', (update: Partial<FeatureFlagResponse>) => {
      const newFeatures: ArbitraryFeatures = { ...this.features(), ...update };
      this.features.set(newFeatures);
    });
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
      const mutation = updateFeatureFlagMutation(feature, value);
      this.http.post(ENVIRONMENT.baseUrl + '/api', {
        query: mutation,
        variables: { key: feature, value },
      }).subscribe();
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

export function updateFeatureFlagMutation(key: string | number, value: boolean) {
  return `
    mutation UpdateFeatureFlag($key: String!, $value: Boolean!) {
      updateFeatureFlag(key: $key, value: $value) {
        key
        value
      }
    }
  `;
}
