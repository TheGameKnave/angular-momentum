import { createHandler } from 'graphql-http/lib/use/express';
import { buildSchema } from 'graphql';
import express from 'express';
import { readFeatureFlags } from '../services/featureFlagService'; // Import LowDB function


// Define GraphQL schema
const schema = buildSchema(`
  type Query

  extend type Query {
    hello: String
    add(a: Int!, b: Int!): Int
    api: String
  }
`);

// Define resolvers
const root = {
  hello: () => 'Hello, world!',
  add: ({ a, b }: { a: number; b: number }) => a + b,
  api: () => {
    return JSON.stringify(readFeatureFlags()); // Read from LowDB
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
