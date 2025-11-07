import { Route } from '@angular/router';
import { FeatureFlagGuard } from './guards/feature-flag.guard';
import { SlugPipe } from './pipes/slug.pipe';
import { COMPONENT_LIST } from './helpers/constants';

// Instantiate the service (without DI, since it's outside Angular context)
const slugPipe = new SlugPipe();

// Generate routes dynamically
export const routes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./components/pages/index/index.component').then(m => m.IndexComponent)
  },
  ...COMPONENT_LIST.map(component => ({
    path: slugPipe.transform(component.name),
    component: component.component,
    canActivate: [FeatureFlagGuard]
  })),
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  }
];