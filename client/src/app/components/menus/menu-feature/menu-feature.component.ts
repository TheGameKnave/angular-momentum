import { ChangeDetectionStrategy, Component, HostListener } from '@angular/core';
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
  expanded = false;
  toggleExpand() {
      this.expanded = !this.expanded;
      console.log(this.expanded);
    }

  constructor(
    readonly componentListService: ComponentListService,
    protected featureFlagService: FeatureFlagService,
    public helpersService: HelpersService,
  ) { }

  componentCount(): number {
    return this.helpersService.enabledComponents().length;
  }
  // Detect click outside the menu
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.sidebar')) {
      this.expanded = false;
    }
  }
    // Collapse if window resized to mobile width
  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    const mobile = window.innerWidth <= 768; // you can adjust breakpoint
    this.expanded = !mobile; // collapsed if mobile
  }
}
