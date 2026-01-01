import { COMPONENT_NAMES } from "@app/constants/translations.constants";
import { ComponentListEntry } from "@app/models/data.model";
import { FeaturesComponent } from "@app/components/pages/features/features.component";
import { GraphqlApiComponent } from "@app/components/pages/graphql-api/graphql-api.component";
import { IndexedDBComponent } from "@app/components/pages/indexeddb/indexeddb.component";
import { InstallersComponent } from "@app/components/pages/installers/installers.component";
import { NotificationsComponent } from "@app/components/pages/notifications/notifications.component";

/**
 * Registry of available page components with their metadata.
 * This constant defines all navigable components in the application,
 * including their display names, component references, and associated icons.
 *
 * Used for:
 * - Route configuration
 * - Navigation menu generation
 * - Feature flag mapping
 *
 * Each entry contains:
 * - name: Display name for the component (used in UI and routing, also a translation key)
 * - component: The component class to render
 * - icon: PrimeIcons CSS class for the component's icon
 * - route: Optional custom route path (defaults to slugified name)
 * - featureFlagged: If true, component visibility is controlled by feature flags (fail-closed).
 *                   If false/undefined, component is always enabled.
 *
 * @readonly
 */
export const COMPONENT_LIST: readonly ComponentListEntry[] = [
  {
    name: COMPONENT_NAMES.FEATURES,
    route: 'features',
    component: FeaturesComponent,
    icon: 'pi pi-list-check'
  },
  {
    name: COMPONENT_NAMES.GRAPHQL_API,
    component: GraphqlApiComponent,
    icon: 'pi pi-cloud-download',
    featureFlagged: true
  },
  {
    name: COMPONENT_NAMES.INDEXEDDB,
    component: IndexedDBComponent,
    icon: 'pi pi-database',
    featureFlagged: true
  },
  {
    name: COMPONENT_NAMES.INSTALLERS,
    component: InstallersComponent,
    icon: 'pi pi-box',
    featureFlagged: true
  },
  {
    name: COMPONENT_NAMES.NOTIFICATIONS,
    component: NotificationsComponent,
    icon: 'pi pi-bell',
    featureFlagged: true
  },
];

/**
 * Type-safe union of all component names from COMPONENT_LIST.
 * Automatically derived from the COMPONENT_LIST constant to ensure
 * type safety when referencing component names throughout the application.
 *
 * Valid values: 'Features' | 'GraphQL API' | 'IndexedDB' | 'Installers' | 'Notifications'
 */
export type ComponentName = typeof COMPONENT_LIST[number]['name'];
