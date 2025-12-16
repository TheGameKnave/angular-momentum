import { normalizeLanguage, getLangFn } from './language.helper';
import { GetLangParams } from '@jsverse/transloco-persist-lang';

describe('normalizeLanguage', () => {
  it('should return undefined for undefined input', () => {
    expect(normalizeLanguage(undefined)).toBeUndefined();
  });

  it('should return undefined for null input', () => {
    expect(normalizeLanguage(null)).toBeUndefined();
  });

  it('should return supported languages unchanged', () => {
    expect(normalizeLanguage('en-US')).toBe('en-US');
    expect(normalizeLanguage('en-GB')).toBe('en-GB');
    expect(normalizeLanguage('de')).toBe('de');
    expect(normalizeLanguage('fr')).toBe('fr');
    expect(normalizeLanguage('es')).toBe('es');
    expect(normalizeLanguage('zh-CN')).toBe('zh-CN');
    expect(normalizeLanguage('zh-TW')).toBe('zh-TW');
    expect(normalizeLanguage('sv-BO')).toBe('sv-BO');
  });

  it('should map bare language codes to regional variants', () => {
    expect(normalizeLanguage('en')).toBe('en-US');
    expect(normalizeLanguage('zh')).toBe('zh-CN');
    expect(normalizeLanguage('sv')).toBe('sv-BO');
  });

  it('should return undefined for unsupported languages', () => {
    expect(normalizeLanguage('ja')).toBeUndefined();
    expect(normalizeLanguage('ko')).toBeUndefined();
    expect(normalizeLanguage('pt')).toBeUndefined();
    expect(normalizeLanguage('')).toBeUndefined();
  });

  it('should map unsupported regional variants to supported base or fallback', () => {
    // es-MX → es (we support 'es' but not 'es-MX')
    expect(normalizeLanguage('es-MX')).toBe('es');
    expect(normalizeLanguage('es-AR')).toBe('es');
    // de-AT → de (we support 'de' but not 'de-AT')
    expect(normalizeLanguage('de-AT')).toBe('de');
    expect(normalizeLanguage('de-CH')).toBe('de');
    // fr-CA → fr (we support 'fr' but not 'fr-CA')
    expect(normalizeLanguage('fr-CA')).toBe('fr');
    // en-AU → en-US (we support 'en-US' but not 'en-AU' or bare 'en')
    expect(normalizeLanguage('en-AU')).toBe('en-US');
    expect(normalizeLanguage('en-NZ')).toBe('en-US');
  });
});

describe('getLangFn', () => {
  const baseParams: GetLangParams = {
    cachedLang: 'en-US',
    browserLang: 'es',
    cultureLang: 'fr',
    defaultLang: 'de',
  };

  it('should return cachedLang when defined and supported', () => {
    const lang = getLangFn(baseParams);
    expect(lang).toBe('en-US');
  });

  it('should fallback to browserLang when cachedLang is null', () => {
    const lang = getLangFn({ ...baseParams, cachedLang: null });
    expect(lang).toBe('es');
  });

  it('should fallback to cultureLang when cachedLang and browserLang are unavailable', () => {
    const lang = getLangFn({ ...baseParams, cachedLang: null, browserLang: undefined });
    expect(lang).toBe('fr');
  });

  it('should fallback to defaultLang when all others are unavailable', () => {
    const lang = getLangFn({ ...baseParams, cachedLang: null, browserLang: undefined, cultureLang: '' });
    expect(lang).toBe('de');
  });

  it('should normalize bare language codes', () => {
    // Bare 'en' from browser should normalize to 'en-US'
    let lang = getLangFn({
      cachedLang: null,
      browserLang: 'en',
      cultureLang: '',
      defaultLang: 'de',
    });
    expect(lang).toBe('en-US');

    // Bare 'zh' should normalize to 'zh-CN'
    lang = getLangFn({
      cachedLang: null,
      browserLang: 'zh',
      cultureLang: '',
      defaultLang: 'de',
    });
    expect(lang).toBe('zh-CN');

    // Bare 'sv' should normalize to 'sv-BO'
    lang = getLangFn({
      cachedLang: null,
      browserLang: 'sv',
      cultureLang: '',
      defaultLang: 'de',
    });
    expect(lang).toBe('sv-BO');
  });

  it('should skip unsupported languages and try next option', () => {
    // Unsupported browserLang 'ja' should be skipped, fall to cultureLang
    let lang = getLangFn({
      cachedLang: null,
      browserLang: 'ja',
      cultureLang: 'fr',
      defaultLang: 'de',
    });
    expect(lang).toBe('fr');

    // All unsupported, fall to defaultLang
    lang = getLangFn({
      cachedLang: 'ko',
      browserLang: 'ja',
      cultureLang: 'pt',
      defaultLang: 'de',
    });
    expect(lang).toBe('de');
  });
});
