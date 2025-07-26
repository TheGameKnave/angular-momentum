import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { ComponentListService } from '@app/services/component-list.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { ComponentInstance } from '@app/models/data.model';

@Component({
  selector: 'app-menu-feature',
  templateUrl: './menu-feature.component.html',
  imports: [
    SlugPipe,
    RouterModule,
    TranslocoDirective,
  ],
})
export class MenuFeatureComponent  implements OnInit {
  private componentListService = inject(ComponentListService);
  protected featureFlagService = inject(FeatureFlagService);

  componentList!: ComponentInstance[];

  ngOnInit(): void {
    this.componentList = this.componentListService.getComponentList();
  }


  componentCount(): number {
    return this.componentList.filter(component => this.featureFlagService.getFeature(component.name)).length;
  }

}
