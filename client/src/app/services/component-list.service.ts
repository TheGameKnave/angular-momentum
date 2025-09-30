import { Injectable } from '@angular/core';
import { IndexedDBComponent } from '@app/components/pages/indexeddb/indexeddb.component';
import { GraphqlApiComponent } from '@app/components/pages/graphql-api/graphql-api.component';
import { FeaturesComponent } from '@app/components/pages/features/features.component';
import { ComponentInstance } from '@app/models/data.model';
import { InstallersComponent } from '@app/components/pages/installers/installers.component';

@Injectable({
  providedIn: 'root'
})
export class ComponentListService {

  componentList: ComponentInstance[] = [
    { name: 'Features', component: FeaturesComponent, icon: 'pi pi-list-check' },
    { name: 'GraphQL API', component: GraphqlApiComponent, icon: 'pi pi-cloud-download' },
    { name: 'IndexedDB', component: IndexedDBComponent, icon: 'pi pi-database' },
    { name: 'Installers', component: InstallersComponent, icon: 'pi pi-box' },
  ];

  getComponentList() {
    return this.componentList;
  }
}