import { createHandler } from 'graphql-http/lib/use/express';
import { buildSchema } from 'graphql';
import express from 'express';
import { readFeatureFlags, writeFeatureFlags } from './lowDBService'; // Import LowDB function
import { changeLog } from '../data/changeLog';
import { broadcastNotification, sendNotificationToUser } from './notificationService';
import { NotificationPayload } from '../models/data.model';

/**
 * GraphQL schema definition.
 * Defines queries for feature flags, version, changelog, and docs.
 * Defines mutations for updating feature flags and sending push notifications.
 */
const schema = buildSchema(`
  type Query {
    featureFlags: [FeatureFlag]
    featureFlag(key: String!): Boolean
    docs: String
    version: Float
    changeLog: [ChangeEntry]
  }

  type Mutation {
    updateFeatureFlag(key: String!, value: Boolean!): FeatureFlag
    sendNotification(title: String!, body: String!, icon: String, data: String): NotificationResult
    sendNotificationToSocket(socketId: String!, title: String!, body: String!, icon: String, data: String): NotificationResult
  }

  type ChangeEntry {
    version: String
    date: String
    description: String
    changes: [String]
  }

  type FeatureFlag {
    key: String
    value: Boolean
  }

  type NotificationResult {
    success: Boolean
    message: String
  }
`);

/**
 * Root resolver functions for GraphQL operations.
 * Provides resolver implementations with WebSocket integration for real-time feature flag and notification updates.
 * @param io - Socket.IO server instance for broadcasting real-time updates
 * @returns Object containing resolver functions for all queries and mutations
 */
const root = (io: any) => ({
  /**
   * Retrieves all feature flags.
   * @returns Array of feature flag objects with key and value
   */
  featureFlags: () => {
    const featureFlags = readFeatureFlags();
    return Object.keys(featureFlags).map(key => ({ key, value: featureFlags[key] }));
  },

  /**
   * Retrieves a specific feature flag value.
   * @param key - Feature flag key to lookup
   * @returns Boolean value of the feature flag
   */
  featureFlag: ({ key }: { key: string }) => {
    const featureFlags = readFeatureFlags();
    return featureFlags[key];
  },

  /**
   * Updates a feature flag value and broadcasts the change via WebSocket.
   * @param key - Feature flag key to update
   * @param value - New boolean value for the feature flag
   * @returns Updated feature flag object
   */
  updateFeatureFlag: async ({ key, value }: { key: string; value: boolean }) => {
    const updatedFeatures = await writeFeatureFlags({ [key]: value });
    // Emit WebSocket event when a feature flag is updated
    io.emit('update-feature-flags', updatedFeatures);
    return { key, value };
  },

  /**
   * Broadcasts a push notification to all connected clients via WebSocket.
   * @param title - Notification title
   * @param body - Notification body text
   * @param icon - Optional icon URL
   * @param data - Optional JSON string containing additional data
   * @returns Result object with success status and message
   */
  sendNotification: ({ title, body, icon, data }: { title: string; body: string; icon?: string; data?: string }) => {
    try {
      const notificationPayload: NotificationPayload = {
        title,
        body,
        icon,
        data: data ? JSON.parse(data) : undefined
      };
      broadcastNotification(io, notificationPayload);
      return { success: true, message: 'Notification sent to all clients' };
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, message: `Error: ${error}` };
    }
  },

  /**
   * Sends a push notification to a specific connected client via WebSocket.
   * @param socketId - Target socket ID
   * @param title - Notification title
   * @param body - Notification body text
   * @param icon - Optional icon URL
   * @param data - Optional JSON string containing additional data
   * @returns Result object with success status and message
   */
  sendNotificationToSocket: ({ socketId, title, body, icon, data }: { socketId: string; title: string; body: string; icon?: string; data?: string }) => {
    try {
      const notificationPayload: NotificationPayload = {
        title,
        body,
        icon,
        data: data ? JSON.parse(data) : undefined
      };
      sendNotificationToUser(io, socketId, notificationPayload);
      return { success: true, message: `Notification sent to socket ${socketId}` };
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, message: `Error: ${error}` };
    }
  },

  /**
   * Returns the current API version.
   * @returns API version number
   */
  version: () => {
    return 1.0;
  },

  /**
   * Returns the application changelog.
   * @returns Array of changelog entries with version, date, description, and changes
   */
  changeLog: () => {
    return changeLog;
  },

  /**
   * Returns API documentation in markdown format.
   * @returns Markdown string containing API usage instructions
   */
  docs: () => {
    return `
      # API Documentation

      This GraphQL-powered API provides access to feature flags, push notifications, and app metadata.

      ## Queries

      * \`featureFlags\`: Returns a list of all feature flags.
      * \`featureFlag(key: String!)\`: Returns the status of a specific feature flag.
      * \`docs\`: Returns the API instructions (this document).
      * \`version\`: Returns the APP version in semver format.
      * \`changeLog\`: Returns the APP change log.

      ## Mutations

      * \`updateFeatureFlag(key: String!, value: Boolean!)\`: Updates the status of a feature flag.
      * \`sendNotification(title: String!, body: String!, icon: String, data: String)\`: Broadcasts a push notification to all connected clients via WebSocket.
      * \`sendNotificationToSocket(socketId: String!, title: String!, body: String!, icon: String, data: String)\`: Sends a push notification to a specific socket/user via WebSocket.

      ## Authentication

      This API uses [insert authentication mechanism here].
    `;
  },
});

/**
 * Creates Express middleware for handling GraphQL requests.
 * Restricts requests to POST method only and integrates Socket.IO instance for real-time updates.
 * @returns Express middleware function that handles GraphQL POST requests
 */
export function graphqlMiddleware() {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const io = req.app.get('io'); // Retrieve io instance

    if (req.method === 'POST') {
      express.json()(req, res, () => {
        createHandler({
          schema,
          rootValue: root(io), // Pass io to root resolvers
        })(req, res, next);
      });
    } else {
      res.status(405).send({ error: 'Method Not Allowed' });
    }
  };
}
