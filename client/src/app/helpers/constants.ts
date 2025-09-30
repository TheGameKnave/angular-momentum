import { Installer } from "@app/models/data.model";

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
export const INSTALLERS: Installer[] = [
  {
    name: 'MacOS',
    icon: 'pi-apple',
    url: 'https://cdn.angularmomentum.app/dist/{version}/AngularMomentum_{version}.dmg',
  }
];