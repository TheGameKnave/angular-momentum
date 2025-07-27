import { Injectable, Inject } from '@angular/core';
import { ENVIRONMENT } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class HelpersService {
  constructor(@Inject(ENVIRONMENT) private env: any) {
    if (this.env.env !== 'production') {
      (window as any).helpersService = this;
    }
  }
}
