import { routes } from './app.routing';
import { ComponentListService } from '@app/services/component-list.service';

describe('App Routing Configuration', () => {
  let componentService: ComponentListService;
  let componentList: { name: string; component: any }[];

  beforeEach(() => {
    componentService = new ComponentListService();
    componentList = componentService.getComponentList();
  });

  it('should define the base route', async () => {
    const indexRoute = routes.find(route => route.path === '');
    expect(indexRoute).toBeDefined();
    expect(indexRoute?.loadComponent).toBeDefined();

    // Ensure loadComponent function resolves correctly
    const module = await indexRoute!.loadComponent!();
    expect(module).toBeTruthy();
  });

  it('should generate routes from component list', () => {
    const dynamicRoutes = componentList.map(component => ({
      path: component.name.toLowerCase().replace(/\s+/g, '-'),
      component: component.component,
    }));

    dynamicRoutes.forEach(dynamicRoute => {
      const route = routes.find(r => r.path === dynamicRoute.path);
      expect(route).toBeDefined();
      expect(route?.component).toBe(dynamicRoute.component);
    });
  });

  it('should define a wildcard route that redirects to root', () => {
    const wildcardRoute = routes.find(route => route.path === '**');
    expect(wildcardRoute).toBeDefined();
    expect(wildcardRoute?.redirectTo).toBe('');
  });

  it('should match the expected number of routes', () => {
    expect(routes.length).toBe(2 + componentList.length); // base route + wildcard + generated routes
  });
});
