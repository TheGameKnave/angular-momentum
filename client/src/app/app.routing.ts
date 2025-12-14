import { Route } from '@angular/router';
import { FeatureFlagGuard } from './guards/feature-flag.guard';
import { AuthGuard } from './guards/auth.guard';
import { SlugPipe } from './pipes/slug.pipe';
import { COMPONENT_LIST } from './helpers/component-list';

// Instantiate the service (without DI, since it's outside Angular context)
const slugPipe = new SlugPipe();

// Lazy load helpers (ignored from coverage as they're just routing glue)
/**
 * Lazy load the index component.
 * @returns Promise resolving to IndexComponent
 */
// istanbul ignore next - lazy load function, routing glue code
async function loadIndexComponent() {
  return (await import('./components/pages/index/index.component')).IndexComponent;
}

/**
 * Lazy load the profile component.
 * @returns Promise resolving to ProfileComponent
 */
// istanbul ignore next - lazy load function, routing glue code
async function loadProfileComponent() {
  return (await import('./components/pages/profile/profile.component')).ProfileComponent;
}

/**
 * Lazy load the privacy policy component.
 * @returns Promise resolving to PrivacyPolicyComponent
 */
// istanbul ignore next - lazy load function, routing glue code
async function loadPrivacyPolicyComponent() {
  return (await import('./components/privacy/privacy-policy/privacy-policy.component')).PrivacyPolicyComponent;
}

// Generate routes dynamically
export const routes: Route[] = [
  {
    path: '',
    loadComponent: loadIndexComponent
  },
  // Auth routes
  {
    path: 'profile',
    loadComponent: loadProfileComponent,
    canActivate: [AuthGuard]
  },
  // Privacy & Legal
  {
    path: 'privacy',
    loadComponent: loadPrivacyPolicyComponent
  },
  // Dynamic feature routes
  ...COMPONENT_LIST.map(component => ({
    path: slugPipe.transform(component.name),
    component: component.component,
    canActivate: [FeatureFlagGuard]
  })),
  // Fallback route
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  }
];