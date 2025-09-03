import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { ComponentListService } from '@app/services/component-list.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { HelpersService } from '@app/services/helpers.service';

@Component({
  selector: 'app-menu-feature',
  templateUrl: './menu-feature.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SlugPipe,
    RouterModule,
    TranslocoDirective,
  ],
  styleUrls: ['./menu-feature.component.scss'],
})
export class MenuFeatureComponent {
  expanded = signal(false);
  constructor(
    readonly componentListService: ComponentListService,
    protected featureFlagService: FeatureFlagService,
    protected readonly helpersService: HelpersService,
  ) {}

  componentCount(): number {
    return this.helpersService.enabledComponents().length;
  }
  // Detect mouseEnter and expand
  @HostListener('mouseenter')
  onMouseEnter() {
    this.expanded.set(true);
  }
  @HostListener('mouseleave')
  onMouseLeave() {
    this.expanded.set(false);
  }
  // close the menu on click
  @HostListener('click')
  onClick() {
    this.expanded.set(false);
  }
  
  
}
