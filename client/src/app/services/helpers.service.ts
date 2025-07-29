import { Injectable, Inject } from '@angular/core';
import { ENVIRONMENT } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class HelpersService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(@Inject(ENVIRONMENT) readonly env: any) {
    if (this.env.env !== 'production') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).helpersService = this;
    }
  }
}
