import { ChangeDetectionStrategy, Component, HostListener, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { ComponentListService } from '@app/services/component-list.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { ComponentInstance } from '@app/models/data.model';

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
export class MenuFeatureComponent  implements OnInit {
  componentList!: ComponentInstance[];
  expanded = false;
  toggleExpand() {
      this.expanded = !this.expanded;
      console.log(this.expanded);
    }
  constructor(
    readonly componentListService: ComponentListService,
    protected featureFlagService: FeatureFlagService,
  ) { }

  ngOnInit(): void {
    this.componentList = this.componentListService.getComponentList();
    console.log(this.expanded);
  }


  componentCount(): number {
    return this.componentList.filter(component => this.featureFlagService.getFeature(component.name)).length;
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
