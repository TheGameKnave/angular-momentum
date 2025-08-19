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
    { name: 'Features', component: FeaturesComponent, icon: 'pi pi-list' },
    { name: 'Environment', component: EnvironmentComponent, icon: 'pi pi-box' },
    { name: 'GraphQL API', component: GraphqlApiComponent, icon: 'pi pi-cloud' },
    { name: 'IndexedDB', component: IndexedDBComponent, icon: 'pi pi-save' },
  ];

  getComponentList() {
    return this.componentList;
  }
}