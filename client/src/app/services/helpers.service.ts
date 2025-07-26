import { Injectable, InjectionToken, inject } from '@angular/core';

declare global {
  interface Window {
    helpersService?: HelpersService;
  }
}

const ENVIRONMENT_TOKEN = new InjectionToken<{ baseUrl: string; env: string }>('ENVIRONMENT');

@Injectable({
  providedIn: 'root',
})
export class HelpersService {
  private env = inject(ENVIRONMENT_TOKEN);

  constructor() {
    if (this.env.env !== 'production') {
      window.helpersService = this;
    }
  }
}
