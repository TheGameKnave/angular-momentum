import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes, RenderMode } from '@angular/ssr';
import { appProviders } from './main.config';

const serverProviders: ApplicationConfig = {
  providers: [
    // Explicitly enable SSR mode (not SSG) so REQUEST token is available
    provideServerRendering(withRoutes([{ path: '**', renderMode: RenderMode.Server }])),
  ],
};

export const serverConfig = mergeApplicationConfig(
  { providers: appProviders },
  serverProviders
);
