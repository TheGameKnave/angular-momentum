import { Injectable } from '@angular/core';
import { IndexedDBComponent } from '../components/pages/indexeddb/indexeddb.component';
import { GraphqlApiComponent } from '../components/pages/graphql-api/graphql-api.component';
import { EnvironmentComponent } from '../components/pages/environment/environment.component';
import { FeaturesComponent } from '../components/pages/features/features.component';

export type ComponentInstance = {
  name: string,
  component: any,
  icon: string,
}

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
  constructor() { }

  getComponentList() {
    return this.componentList;
  }
}