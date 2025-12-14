import {
  getNavTranslationKey,
  getFeatureTranslationKey,
  COMPONENT_NAMES,
  ARBITRARY_FEATURE_NAMES,
} from './translations.constants';

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

  describe('getFeatureTranslationKey', () => {
    it('should return feature-namespaced translation key', () => {
      expect(getFeatureTranslationKey('Features')).toBe('feature.Features');
      expect(getFeatureTranslationKey('App Version')).toBe('feature.App Version');
    });

    it('should work with all COMPONENT_NAMES values', () => {
      Object.values(COMPONENT_NAMES).forEach(name => {
        expect(getFeatureTranslationKey(name)).toBe(`feature.${name}`);
      });
    });

    it('should work with all ARBITRARY_FEATURE_NAMES values', () => {
      ARBITRARY_FEATURE_NAMES.forEach(name => {
        expect(getFeatureTranslationKey(name)).toBe(`feature.${name}`);
      });
    });
  });
});
