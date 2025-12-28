import { routes } from './app.routing';
import { COMPONENT_LIST } from '@app/helpers/component-list';

describe('App Routing Configuration', () => {
  const componentList = COMPONENT_LIST;

  it('should define the base route', () => {
    const indexRoute = routes.find(route => route.path === '');
    expect(indexRoute).toBeDefined();
    expect(indexRoute?.component).toBeDefined();
  });

  it('should generate routes from component list', () => {
    for (const entry of componentList) {
      const expectedPath = entry.route ?? entry.name.toLowerCase().replace(/\s+/g, '-');
      const route = routes.find(r => r.path === expectedPath);
      expect(route).toBeDefined();
      expect(route?.component).toBe(entry.component);
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
