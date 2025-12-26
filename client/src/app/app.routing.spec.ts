import { routes } from './app.routing';
import { COMPONENT_LIST } from '@app/helpers/component-list';

describe('App Routing Configuration', () => {
  const componentList = COMPONENT_LIST;

  it('should define the base route', async () => {
    const indexRoute = routes.find(route => route.path === '');
    expect(indexRoute).toBeDefined();
    expect(indexRoute?.loadComponent).toBeDefined();

    // Ensure loadComponent function resolves correctly
    const module = await indexRoute!.loadComponent!();
    expect(module).toBeTruthy();
  });

  it('should generate routes from component list', async () => {
    for (const component of componentList) {
      const expectedPath = component.route ?? component.name.toLowerCase().replace(/\s+/g, '-');
      const route = routes.find(r => r.path === expectedPath);
      expect(route).toBeDefined();
      expect(route?.loadComponent).toBeDefined();

      // Verify lazy loading works
      const loadedComponent = await route!.loadComponent!();
      const expectedComponent = await component.loadComponent();
      expect(loadedComponent).toBe(expectedComponent);
    }
  });

  it('should define a wildcard route that redirects to root', () => {
    const wildcardRoute = routes.find(route => route.path === '**');
    expect(wildcardRoute).toBeDefined();
    expect(wildcardRoute?.redirectTo).toBe('');
  });

  it('should match the expected number of routes', () => {
    expect(routes.length).toBe(4 + componentList.length); // base route + profile route + privacy route + wildcard + generated routes
  });
});
