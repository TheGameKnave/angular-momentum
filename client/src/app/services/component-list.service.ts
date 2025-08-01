import { Injectable } from '@angular/core';
import { IndexedDBComponent } from '@app/components/pages/indexeddb/indexeddb.component';
import { GraphqlApiComponent } from '@app/components/pages/graphql-api/graphql-api.component';
import { EnvironmentComponent } from '@app/components/pages/environment/environment.component';
import { FeaturesComponent } from '@app/components/pages/features/features.component';
import { ComponentInstance } from '@app/models/data.model';

@Injectable({
  providedIn: 'root'
})
export class ComponentListService {

  componentList: ComponentInstance[] = [
    { name: 'Features', component: FeaturesComponent, icon: 'list' },
    { name: 'Environment', component: EnvironmentComponent, icon: 'cube' },
    { name: 'GraphQL API', component: GraphqlApiComponent, icon: 'cloud' },
    { name: 'IndexedDB', component: IndexedDBComponent, icon: 'save' },
  ];

  getComponentList() {
    return this.componentList;
  }
}