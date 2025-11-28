# Hybrid API Architecture Guide

This guide documents the hybrid GraphQL + REST API architecture used in this application.

## Why Hybrid?

This application demonstrates **both GraphQL and REST** in production use, providing adopters with working examples of each pattern:

### Use GraphQL for:
- 🎯 **Complex, nested queries** - User profiles with related data (username, settings, preferences)
- 🎯 **Flexible data fetching** - Different clients need different fields
- 🎯 **Aggregated queries** - Combining multiple data sources in a single request
- 🎯 **Real-time subscriptions** - Live updates with GraphQL subscriptions

### Use REST for:
- ✅ **Simple CRUD operations** - Feature flags, metadata
- ✅ **Standard HTTP patterns** - Better caching, CDN integration
- ✅ **Simple broadcasts** - Notifications, events

## API Structure

### GraphQL Endpoint (`/graphql`)

**Complex queries and mutations:**
- `validateUsername(username: String!)` - Username validation with fingerprinting
- `checkUsernameAvailability(username: String!)` - Check availability
- `createUsername(userId: String!, username: String!)` - Create username
- `getEmailByUsername(username: String!)` - Email lookup for login

### REST Endpoints (`/api`)

**Simple CRUD operations:**
```
/api
├── /feature-flags          # Feature flag management
│   ├── GET    /
│   ├── GET    /:key
│   ├── PUT    /:key
│   └── DELETE /:key
│
├── /notifications          # Push notifications
│   ├── POST /broadcast
│   └── POST /send/:socketId
│
└── /                       # Metadata
    ├── GET /version
    ├── GET /changelog
    └── GET /docs
```

## Architecture Decisions

### GraphQL Operations (Complex)

**Username Management** - Uses GraphQL for complex validation and nested data:
```graphql
mutation ValidateUsername($username: String!) {
  validateUsername(username: $username) {
    valid
    fingerprint
    error
  }
}

query GetEmailByUsername($username: String!) {
  getEmailByUsername(username: $username) {
    email
  }
}
```

### REST Operations (Simple CRUD)

**Feature Flags** - Migrated from GraphQL to REST:
| Old (GraphQL) | New (REST) | Method |
|--------------|-----------|--------|
| `query { featureFlags }` | `/api/feature-flags` | GET |
| `query { featureFlag(key: "x") }` | `/api/feature-flags/:key` | GET |
| `mutation { updateFeatureFlag }` | `/api/feature-flags/:key` | PUT |

**Metadata** - Migrated to REST:
| Old (GraphQL) | New (REST) | Method |
|--------------|-----------|--------|
| `query { version }` | `/api/version` | GET |
| `query { changeLog }` | `/api/changelog` | GET |
| `query { docs }` | `/api/docs` | GET |

**Notifications** - Migrated to REST:
| Old (GraphQL) | New (REST) | Method |
|--------------|-----------|--------|
| `mutation { sendNotification }` | `/api/notifications/broadcast` | POST |
| `mutation { sendNotificationToSocket }` | `/api/notifications/send/:id` | POST |

## Client-Side Examples

### REST Example (Simple CRUD)

**Feature Flags** - Migrated to HttpClient:
```typescript
// services/feature-flag.service.ts
getFeatureFlags(): Observable<FeatureFlag[]> {
  return this.http.get<FeatureFlag[]>('/api/feature-flags');
}

updateFeatureFlag(key: string, value: boolean): Observable<any> {
  return this.http.put(`/api/feature-flags/${key}`, { value });
}
```

### GraphQL Example (Complex Queries)

**Username Validation** - Keeps using Apollo for complex operations:
```typescript
// services/username.service.ts
private readonly validateMutation = gql`
  mutation ValidateUsername($username: String!) {
    validateUsername(username: $username) {
      valid
      fingerprint
      error
    }
  }
`;

validateUsername(username: string): Observable<ValidationResult> {
  return this.apollo.mutate({
    mutation: this.validateMutation,
    variables: { username }
  }).pipe(
    map(result => result.data.validateUsername)
  );
}
```

## Server-Side Structure

### Hybrid Architecture

```
server/
├── routes/                      # REST endpoints
│   ├── auth.routes.ts           📝 Example (username ops use GraphQL)
│   ├── feature-flags.routes.ts  ✅ Active (simple CRUD)
│   ├── metadata.routes.ts       ✅ Active (simple GET)
│   ├── notifications.routes.ts  ✅ Active (simple POST)
│   └── index.ts                 ✅ Router
│
├── services/
│   ├── graphqlService.ts        ✅ Active (complex queries)
│   ├── usernameService.ts       ✓ Shared by GraphQL
│   ├── lowDBService.ts          ✓ Shared by both
│   └── notificationService.ts   ✓ Shared by both
│
└── index.ts                     ✓ Mounts both /api and /graphql
```

### Server Entry Point

```typescript
// server/index.ts

// REST API routes (simple CRUD operations)
app.use('/api', apiLimiter, apiRoutes);

// GraphQL endpoint (complex queries, username operations)
app.all('/graphql', apiLimiter, graphqlMiddleware());
```

## Decision Guide for Adopters

**Choose GraphQL when you need:**
- Complex nested queries (user → username → settings → preferences)
- Flexible field selection (mobile vs web need different data)
- Type safety with schema validation
- Real-time subscriptions
- Multiple related entities in one request

**Choose REST when you need:**
- Simple CRUD operations
- HTTP caching (CDN, browser cache)
- Standard tooling (curl, Postman)
- WebHooks or third-party integrations

## Benefits of Hybrid Approach

### GraphQL Benefits:
- 🎯 **Type Safety** - Schema validation catches errors early
- 🎯 **Flexible Queries** - Clients request exactly what they need
- 🎯 **Single Endpoint** - All complex operations through `/graphql`
- 🎯 **Nested Data** - Fetch related entities in one query

### REST Benefits:
- ✅ **Simplicity** - No schema/resolver overhead for CRUD
- ✅ **HTTP Native** - Caching, CDN, and standard tooling
- ✅ **Debugging** - Standard HTTP requests in DevTools

### Combined Architecture:
- 🔥 **Best of Both** - Right tool for the right job
- 📚 **Learning Resource** - Working examples of both patterns
- 🚀 **Production Ready** - Battle-tested hybrid approach

## Testing the API

### Testing REST Endpoints (curl)

```bash
# Feature flags
curl http://localhost:4201/api/feature-flags
curl -X PUT http://localhost:4201/api/feature-flags/darkMode \
  -H "Content-Type: application/json" \
  -d '{"value": true}'

# Notifications
curl -X POST http://localhost:4201/api/notifications/broadcast \
  -H "Content-Type: application/json" \
  -d '{"title": "Hello", "body": "World"}'

# Metadata
curl http://localhost:4201/api/version
curl http://localhost:4201/api/changelog
```

### Testing GraphQL Endpoint (curl)

```bash
# Validate username
curl -X POST http://localhost:4201/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { validateUsername(username: \"José™ 🎨\") { valid fingerprint error } }"
  }'

# Check availability
curl -X POST http://localhost:4201/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { checkUsernameAvailability(username: \"José™ 🎨\") { available fingerprint error } }"
  }'

# Email lookup
curl -X POST http://localhost:4201/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { getEmailByUsername(username: \"José™ 🎨\") { email } }"
  }'
```
