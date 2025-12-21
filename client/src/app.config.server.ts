import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appProviders } from './main.config';

const serverProviders: ApplicationConfig = {
  providers: [provideServerRendering()],
};

export const serverConfig = mergeApplicationConfig(
  { providers: appProviders },
  serverProviders
);
