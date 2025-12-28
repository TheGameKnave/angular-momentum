import { Route } from '@angular/router';
import { FeatureFlagGuard } from './guards/feature-flag.guard';
import { AuthGuard } from './guards/auth.guard';
import { SlugPipe } from './pipes/slug.pipe';
import { COMPONENT_LIST } from './helpers/component-list';
import { IndexComponent } from './components/pages/index/index.component';
import { ProfileComponent } from './components/pages/profile/profile.component';
import { PrivacyPolicyComponent } from './components/privacy/privacy-policy/privacy-policy.component';

// Instantiate the service (without DI, since it's outside Angular context)
const slugPipe = new SlugPipe();

// Generate routes dynamically
export const routes: Route[] = [
  {
    path: '',
    component: IndexComponent
  },
  // Auth routes
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard]
  },
  // Privacy & Legal
  {
    path: 'privacy',
    component: PrivacyPolicyComponent
  },
  // Dynamic feature routes
  ...COMPONENT_LIST.map(entry => ({
    path: entry.route ?? slugPipe.transform(entry.name),
    component: entry.component,
    canActivate: [FeatureFlagGuard]
  })),
  // Fallback route
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  }
];