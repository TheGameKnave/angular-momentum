import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AutoUnsubscribe } from '@app/helpers/unsub';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { ComponentListService } from '@app/services/component-list.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';

@AutoUnsubscribe()
@Component({
  selector: 'app-menu-feature',
  templateUrl: './menu-feature.component.html',
  imports: [
    SlugPipe,
    RouterModule,
    TranslocoDirective,
  ],
})
export class MenuFeatureComponent  implements OnInit, OnDestroy {
  componentList!: any[];

  constructor(
    private componentListService: ComponentListService,
    protected featureFlagService: FeatureFlagService,
  ) { }

  ngOnInit(): void {
    this.componentList = this.componentListService.getComponentList();
  }


  componentCount(): number {
    return this.componentList.filter(component => this.featureFlagService.getFeature(component.name)).length;
  }
  
  ngOnDestroy() {}

}
