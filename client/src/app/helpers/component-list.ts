import { FeaturesComponent } from "@app/components/pages/features/features.component";
import { GraphqlApiComponent } from "@app/components/pages/graphql-api/graphql-api.component";
import { IndexedDBComponent } from "@app/components/pages/indexeddb/indexeddb.component";
import { InstallersComponent } from "@app/components/pages/installers/installers.component";
import { NotificationsComponent } from "@app/components/pages/notifications/notifications.component";

export const COMPONENT_LIST = [
  { name: 'Features', component: FeaturesComponent, icon: 'pi pi-list-check' },
  { name: 'GraphQL API', component: GraphqlApiComponent, icon: 'pi pi-cloud-download' },
  { name: 'IndexedDB', component: IndexedDBComponent, icon: 'pi pi-database' },
  { name: 'Installers', component: InstallersComponent, icon: 'pi pi-box' },
  { name: 'Notifications', component: NotificationsComponent, icon: 'pi pi-bell' },
] as const;

export type ComponentName = typeof COMPONENT_LIST[number]['name'];
