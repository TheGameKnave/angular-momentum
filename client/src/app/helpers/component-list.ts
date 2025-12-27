import { COMPONENT_NAMES } from "@app/constants/translations.constants";
import { ComponentListEntry } from "@app/models/data.model";

/**
 * Registry of available page components with their metadata.
 * This constant defines all navigable components in the application,
 * including their display names, lazy loaders, and associated icons.
 *
 * Used for:
 * - Dynamic component loading (lazy-loaded for performance)
 * - Navigation menu generation
 * - Feature flag mapping
 *
 * Each entry contains:
 * - name: Display name for the component (used in UI and routing, also a translation key)
 * - loadComponent: Async function that lazy-loads the component
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
    loadComponent: () => import('@app/components/pages/features/features.component').then(m => m.FeaturesComponent),
    icon: 'pi pi-list-check'
  },
  {
    name: COMPONENT_NAMES.GRAPHQL_API,
    loadComponent: () => import('@app/components/pages/graphql-api/graphql-api.component').then(m => m.GraphqlApiComponent),
    icon: 'pi pi-cloud-download',
    featureFlagged: true
  },
  {
    name: COMPONENT_NAMES.INDEXEDDB,
    loadComponent: () => import('@app/components/pages/indexeddb/indexeddb.component').then(m => m.IndexedDBComponent),
    icon: 'pi pi-database',
    featureFlagged: true
  },
  {
    name: COMPONENT_NAMES.INSTALLERS,
    loadComponent: () => import('@app/components/pages/installers/installers.component').then(m => m.InstallersComponent),
    icon: 'pi pi-box',
    featureFlagged: true
  },
  {
    name: COMPONENT_NAMES.NOTIFICATIONS,
    loadComponent: () => import('@app/components/pages/notifications/notifications.component').then(m => m.NotificationsComponent),
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
