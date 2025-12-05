import { Router, Request, Response } from 'express';
import { changeLog } from '../data/changeLog';

const router = Router();

/**
 * GET /api/version
 * Returns the current API version.
 *
 * Response:
 * {
 *   "version": 1
 * }
 */
router.get('/version', (req: Request, res: Response) => {
  res.json({ version: 1 });
});

/**
 * GET /api/changelog
 * Returns the application changelog.
 *
 * Response:
 * [
 *   {
 *     "version": "1.0.0",
 *     "date": "2024-01-15",
 *     "description": "Initial release",
 *     "changes": ["Feature 1", "Feature 2"]
 *   }
 * ]
 */
router.get('/changelog', (req: Request, res: Response) => {
  res.json(changeLog);
});

/**
 * GET /api/docs
 * Returns API documentation in markdown format.
 *
 * Response:
 * {
 *   "markdown": "# API Documentation..."
 * }
 */
router.get('/docs', (req: Request, res: Response) => {
  const markdown = `
# Hybrid API Documentation

This application uses a **hybrid GraphQL + REST architecture**:
- **GraphQL** (\`/gql\`) for complex queries with nested data
- **REST** (\`/api\`) for simple CRUD operations

## GraphQL Endpoint: \`/gql\`

**Use for complex queries and mutations:**

### Username Management
\`\`\`graphql
# Validate username format and generate fingerprint
mutation { validateUsername(username: "José™ 🎨")
  { valid, fingerprint, error }
}

# Check username availability
mutation { checkUsernameAvailability(username: "José™ 🎨")
  { available, fingerprint, error }
}

# Create username for user
mutation { createUsername(userId: "uuid", username: "José™ 🎨")
  { success, fingerprint, error }
}

# Look up email by username (for login)
query { getEmailByUsername(username: "José™ 🎨")
  { email }
}
\`\`\`

### Feature Flags (also available via REST)
\`\`\`graphql
query { featureFlags
  { key, value }
}

mutation { updateFeatureFlag(key: "darkMode", value: true)
  { key, value }
}
\`\`\`

## REST Endpoints: \`/api\`

**Use for simple CRUD operations:**

### Feature Flags
- \`GET /api/feature-flags\` - Get all feature flags
- \`GET /api/feature-flags/:key\` - Get specific flag
- \`PUT /api/feature-flags/:key\` - Update flag value
  - Body: \`{ "value": true }\`
- \`DELETE /api/feature-flags/:key\` - Delete flag

### Notifications
- \`POST /api/notifications/broadcast\` - Broadcast to all clients
  - Body: \`{ "title": "Hello", "body": "World", "icon": "url", "data": {} }\`
- \`POST /api/notifications/send/:socketId\` - Send to specific client
  - Body: \`{ "title": "Hello", "body": "World", "icon": "url", "data": {} }\`

### Metadata
- \`GET /api/version\` - Get API version
- \`GET /api/changelog\` - Get changelog
- \`GET /api/docs\` - Get this documentation

## When to Use Which?

**Choose GraphQL when:**
- Complex nested queries (user → username → settings)
- Flexible field selection
- Type safety with schema validation

**Choose REST when:**
- Simple CRUD operations
- HTTP caching needed
- Standard tooling (curl, Postman)

For more details, see \`HYBRID_API_ARCHITECTURE.md\`.
  `.trim();

  res.json({ markdown });
});

export default router;
