import { effect, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HelpersService } from '@app/services/helpers.service';
import { SlugPipe } from '@app/pipes/slug.pipe';

@Injectable({ providedIn: 'root' })
export class FeatureMonitorService {
  constructor(
    private router: Router,
    private helpersService: HelpersService,
    private slugPipe: SlugPipe,
  ) {
    effect(() => {
      const url = this.router.url;
      const currentSegment = url.split('/').filter(Boolean)[0] ?? '';
      const allowed = this.helpersService.enabledComponents().map(c =>
        this.slugPipe.transform(c.name)
      );

      if (currentSegment && !allowed.includes(currentSegment)) {
        this.router.navigate(['/']);
      }
    });
  }
}
