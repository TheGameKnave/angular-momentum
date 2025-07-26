import { Type } from "@angular/core";

// 'New Feature': boolean;
// Add more arbitrary features here;
export type ArbitraryFeatures = Record<string, boolean | undefined>;

export type ComponentFlags = Record<ComponentInstance['name'], boolean>;

export type FeatureFlagResponse = ArbitraryFeatures & ComponentFlags;

export interface ApiResponse {
  data: unknown; // You can replace 'any' with a more specific type if you know what it is
}

export interface ComponentInstance {
  name: string,
  component: Type<unknown>,
  icon: string,
}

export interface FeatureFlag {
  key: string;
  value: boolean;
}