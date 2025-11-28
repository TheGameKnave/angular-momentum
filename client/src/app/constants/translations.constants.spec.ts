import { getNavTranslationKey, COMPONENT_NAMES } from './translations.constants';

describe('translations.constants', () => {
  describe('getNavTranslationKey', () => {
    it('should return nav-namespaced translation key', () => {
      expect(getNavTranslationKey('Features')).toBe('nav.Features');
      expect(getNavTranslationKey('GraphQL API')).toBe('nav.GraphQL API');
    });

    it('should work with all COMPONENT_NAMES values', () => {
      Object.values(COMPONENT_NAMES).forEach(name => {
        expect(getNavTranslationKey(name)).toBe(`nav.${name}`);
      });
    });
  });
});
