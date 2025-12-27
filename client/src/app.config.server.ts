import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes, RenderMode } from '@angular/ssr';
import { serverProviders } from './main.config';

const ssrProviders: ApplicationConfig = {
  providers: [
    // Explicitly enable SSR mode (not SSG) so REQUEST token is available
    // Profile route uses client-only rendering since it requires authentication
    provideServerRendering(withRoutes([
      { path: 'profile', renderMode: RenderMode.Client },
      { path: '**', renderMode: RenderMode.Server },
    ])),
  ],
};

export const serverConfig = mergeApplicationConfig(
  { providers: serverProviders },
  ssrProviders
);
