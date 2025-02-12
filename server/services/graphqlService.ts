import { createHandler } from 'graphql-http/lib/use/express';
import { buildSchema } from 'graphql';
import express from 'express';
import { readFeatureFlags, writeFeatureFlags } from './lowDBService'; // Import LowDB function


// Define GraphQL schema
const schema = buildSchema(`
  type Query {
    featureFlags: [FeatureFlag]
    featureFlag(key: String!): Boolean
    docs: String
  }

  type Mutation {
    updateFeatureFlag(key: String!, value: Boolean!): FeatureFlag
  }

  type FeatureFlag {
    key: String
    value: Boolean
  }
`);

// Define resolvers
const root = {
  featureFlags: () => {
    const featureFlags = readFeatureFlags();
    return Object.keys(featureFlags).map(key => ({ key, value: featureFlags[key] }));
  },

  featureFlag: ({ key }: { key: string }) => {
    const featureFlags = readFeatureFlags();
    return featureFlags[key];
  },

  updateFeatureFlag: ({ key, value }: { key: string; value: boolean }) => {
    writeFeatureFlags({ [key]: value });
    return { key, value };
  },
  docs: () => {
    return `
      # API Documentation

      This API provides access to feature flags and allows you to update their status.

      ## Queries

      * \`featureFlags\`: Returns a list of all feature flags.
      * \`featureFlag(key: String!)\`: Returns the status of a specific feature flag.
      * \`docs\`: Returns the API instructions (this document).

      ## Mutations

      * \`updateFeatureFlag(key: String!, value: Boolean!)\`: Updates the status of a feature flag.

      ## Authentication

      This API uses [insert authentication mechanism here].
    `;
  },
};

// Create middleware function for GraphQL
export function graphqlMiddleware() {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const isLocalhost = req.hostname === 'localhost' || req.ip === '127.0.0.1';

    // only works locally.... use different thing, NEED URL OF DEPL
    // to implement, have url sent down from client
    if (isLocalhost) {
      console.log('GraphQL request from localhost:', req.body);
    } else {
      console.log('GraphQL request from external source:', req.ip);
    }

    if (req.method === 'POST') {
      express.json()(req, res, () => {
        createHandler({ schema, rootValue: root })(req, res, next);
      });
    } else {
      next();
    }
  };
}
