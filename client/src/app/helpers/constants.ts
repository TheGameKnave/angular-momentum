export const SUPPORTED_LANGUAGES: string[] = [
  'en',
  'de',
  'fr',
  'es',
  'zh-CN',
  'zh-TW'
];
export const SCREEN_SIZES: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
};
export const INSTALLERS: Record<'name' | 'icon' | 'url', string>[] = [
  {
    name: 'iOS',
    icon: 'pi-mobile',
    url: 'https://apps.apple.com/us/app/angular-momentum/id6753187258',
  },
  {
    name: 'Android',
    icon: 'pi-android',
    url: 'https://play.google.com/store/apps/details?id=app.angularmomentum',
  },
  {
    name: 'Windows',
    icon: 'pi-microsoft',
    url: 'https://github.com/TheGameKnave/angular-momentum/releases/latest/download/Angular.Momentum_{version}_x64_en-US_windows.msi',
  },
  {
    name: 'Mac',
    icon: 'pi-apple',
    url: 'https://github.com/TheGameKnave/angular-momentum/releases/latest/download/Angular.Momentum_{version}_x64_darwin.dmg',
  },
  {
    name: 'Linux',
    icon: 'pi-desktop',
    url: 'https://github.com/TheGameKnave/angular-momentum/releases/latest/download/Angular.Momentum_{version}_amd64_linux.AppImage',
  },
];
export const PLATFORMS: { platform: string; regex: RegExp }[] = [
  { platform: 'Windows', regex: /Windows/i },
  { platform: 'Mac',     regex: /Mac/i },
  { platform: 'Linux',   regex: /Linux/i },
  { platform: 'Android', regex: /Android/i },
  { platform: 'iOS',     regex: /iOS/i },
];