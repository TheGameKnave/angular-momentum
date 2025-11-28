import { createHandler } from 'graphql-http/lib/use/express';
import { buildSchema } from 'graphql';
import express from 'express';
import { readFeatureFlags, writeFeatureFlags } from './lowDBService'; // Import LowDB function
import { changeLog } from '../data/changeLog';
import { broadcastNotification, sendNotificationToUser } from './notificationService';
import { NotificationPayload } from '../models/data.model';
import { UsernameService } from './usernameService';
import config from '../config/environment';

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
    validateUsername(username: String!): UsernameValidationResult
    checkUsernameAvailability(username: String!): UsernameAvailabilityResult
  }

  type Mutation {
    updateFeatureFlag(key: String!, value: Boolean!): FeatureFlag
    sendNotification(title: String!, body: String!, icon: String, data: String): NotificationResult
    sendNotificationToSocket(socketId: String!, title: String!, body: String!, icon: String, data: String): NotificationResult
    createUsername(userId: String!, username: String!): UsernameCreationResult
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

  type UsernameValidationResult {
    valid: Boolean!
    fingerprint: String
    error: String
  }

  type UsernameAvailabilityResult {
    available: Boolean!
    fingerprint: String
    error: String
  }

  type UsernameCreationResult {
    success: Boolean!
    fingerprint: String
    error: String
  }
`);

// Initialize Username Service
const usernameService = new UsernameService(
  config.supabase_url,
  config.supabase_service_key
);

/**
 * Root resolver functions for GraphQL operations.
 * Provides resolver implementations with WebSocket integration for real-time feature flag and notification updates.
 * @param io - Socket.IO server instance for broadcasting real-time updates
 * @returns Object containing resolver functions for all queries and mutations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      This GraphQL-powered API provides access to feature flags, push notifications, username management, and app metadata.

      ## Queries

      * \`featureFlags\`: Returns a list of all feature flags.
      * \`featureFlag(key: String!)\`: Returns the status of a specific feature flag.
      * \`docs\`: Returns the API instructions (this document).
      * \`version\`: Returns the APP version in semver format.
      * \`changeLog\`: Returns the APP change log.
      * \`validateUsername(username: String!)\`: Validates username format and generates fingerprint.
      * \`checkUsernameAvailability(username: String!)\`: Checks if a username is available.

      ## Mutations

      * \`updateFeatureFlag(key: String!, value: Boolean!)\`: Updates the status of a feature flag.
      * \`sendNotification(title: String!, body: String!, icon: String, data: String)\`: Broadcasts a push notification to all connected clients via WebSocket.
      * \`sendNotificationToSocket(socketId: String!, title: String!, body: String!, icon: String, data: String)\`: Sends a push notification to a specific socket/user via WebSocket.
      * \`createUsername(userId: String!, username: String!)\`: Creates a new username for a user.

      ## Authentication

      This API uses [insert authentication mechanism here].
    `;
  },

  /**
   * Validates username format and generates fingerprint.
   * @param username - Username to validate
   * @returns Validation result with fingerprint
   */
  validateUsername: ({ username }: { username: string }) => {
    return usernameService.validateUsername(username);
  },

  /**
   * Checks if a username is available.
   * @param username - Username to check
   * @returns Availability result
   */
  checkUsernameAvailability: async ({ username }: { username: string }) => {
    const validationResult = usernameService.validateUsername(username);
    if (!validationResult.valid || !validationResult.fingerprint) {
      return {
        available: false,
        error: validationResult.error
      };
    }

    const availabilityResult = await usernameService.checkAvailability(
      validationResult.fingerprint
    );

    return {
      ...availabilityResult,
      fingerprint: validationResult.fingerprint
    };
  },

  /**
   * Creates a new username for a user.
   * @param userId - Supabase user ID
   * @param username - Username to create
   * @returns Creation result
   */
  createUsername: async ({ userId, username }: { userId: string; username: string }) => {
    const validationResult = usernameService.validateUsername(username);
    if (!validationResult.valid || !validationResult.fingerprint) {
      return {
        success: false,
        error: validationResult.error
      };
    }

    return await usernameService.createUsername(
      userId,
      username,
      validationResult.fingerprint
    );
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
