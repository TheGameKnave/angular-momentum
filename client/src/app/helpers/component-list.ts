import { FeaturesComponent } from "@app/components/pages/features/features.component";
import { GraphqlApiComponent } from "@app/components/pages/graphql-api/graphql-api.component";
import { IndexedDBComponent } from "@app/components/pages/indexeddb/indexeddb.component";
import { InstallersComponent } from "@app/components/pages/installers/installers.component";
import { NotificationsComponent } from "@app/components/pages/notifications/notifications.component";

/**
 * Registry of available page components with their metadata.
 * This constant defines all navigable components in the application,
 * including their display names, component classes, and associated icons.
 *
 * Used for:
 * - Dynamic component loading
 * - Navigation menu generation
 * - Feature flag mapping
 *
 * Each entry contains:
 * - name: Display name for the component (used in UI and routing)
 * - component: Angular component class reference
 * - icon: PrimeIcons CSS class for the component's icon
 *
 * @readonly
 */
export const COMPONENT_LIST = [
  { name: 'Features', component: FeaturesComponent, icon: 'pi pi-list-check' },
  { name: 'GraphQL API', component: GraphqlApiComponent, icon: 'pi pi-cloud-download' },
  { name: 'IndexedDB', component: IndexedDBComponent, icon: 'pi pi-database' },
  { name: 'Installers', component: InstallersComponent, icon: 'pi pi-box' },
  { name: 'Notifications', component: NotificationsComponent, icon: 'pi pi-bell' },
] as const;

/**
 * Type-safe union of all component names from COMPONENT_LIST.
 * Automatically derived from the COMPONENT_LIST constant to ensure
 * type safety when referencing component names throughout the application.
 *
 * Valid values: 'Features' | 'GraphQL API' | 'IndexedDB' | 'Installers' | 'Notifications'
 */
export type ComponentName = typeof COMPONENT_LIST[number]['name'];
