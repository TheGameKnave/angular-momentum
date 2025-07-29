import { Route } from '@angular/router';
import { ComponentListService } from '@app/services/component-list.service'; 
import { SlugPipe } from '@app/pipes/slug.pipe';

// Instantiate the service (without DI, since it's outside Angular context)
const componentService = new ComponentListService();
const componentList = componentService.getComponentList();
const slugPipe = new SlugPipe();

// Generate routes dynamically
export const routes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./components/pages/index/index.component').then(m => m.IndexComponent)
  },
  ...componentList.map(component => ({
    path: slugPipe.transform(component.name),
    component: component.component
  })),
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  }
];