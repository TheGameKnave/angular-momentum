import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { HelpersService } from '@app/services/helpers.service';

@Injectable({
  providedIn: 'root'
})
export class FeatureFlagGuard implements CanActivate {

  constructor(
    private router: Router,
    private helpersService: HelpersService,
    private slugPipe: SlugPipe,
  ){}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const routePath = route.url.join('');
    const enabledRoutes = this.helpersService.enabledComponents().map(component => this.slugPipe.transform(component.name));
    if (!enabledRoutes.includes(routePath)) {
      this.router.navigate(['/']);
      return false;
    }
    return true;
  }
}