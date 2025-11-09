import { Type } from "@angular/core";
import { ComponentName } from "@app/helpers/component-list";

// Non-component feature flags - add more arbitrary features here
export type ArbitraryFeatureName = 
  'App Version' | 
  'Environment' | 
  'Language';

export type ArbitraryFeatures = Record<ArbitraryFeatureName, boolean>;

export type ComponentFlags = Record<ComponentName, boolean>;

export type FeatureFlagResponse = ArbitraryFeatures & ComponentFlags;

export interface ApiResponse {
  data: unknown; // You can replace 'any' with a more specific type if you know what it is
}

export type ChangeImpact = 'patch' | 'minor' | 'major'; 

export interface ComponentInstance {
  name: string,
  component: Type<unknown>,
  icon: string,
}

export interface FeatureFlag {
  key: string;
  value: boolean;
}

export interface Installer {
  name: string;
  icon: string;
  url: string;
}