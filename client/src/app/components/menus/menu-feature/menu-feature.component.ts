import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AutoUnsubscribe } from 'src/app/helpers/unsub';
import { SlugPipe } from 'src/app/pipes/slug.pipe';
import { ComponentListService } from 'src/app/services/component-list.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';

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
