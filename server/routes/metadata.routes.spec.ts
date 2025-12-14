import request from 'supertest';
import express, { Express } from 'express';
import metadataRoutes from './metadata.routes';
import { changeLog } from '../data/changeLog';

describe('Metadata Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', metadataRoutes);
  });

  describe('GET /version', () => {
    it('should return API version 1.0', async () => {
      const response = await request(app).get('/api/version');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ version: 1.0 });
    });

    it('should return content-type application/json', async () => {
      const response = await request(app).get('/api/version');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('GET /changelog', () => {
    it('should return the changelog array', async () => {
      const response = await request(app).get('/api/changelog');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return the same data as changeLog import', async () => {
      const response = await request(app).get('/api/changelog');

      expect(response.body).toEqual(changeLog);
    });

    it('should return content-type application/json', async () => {
      const response = await request(app).get('/api/changelog');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should have changelog entries with expected structure', async () => {
      const response = await request(app).get('/api/changelog');

      if (response.body.length > 0) {
        const firstEntry = response.body[0];
        expect(firstEntry).toHaveProperty('version');
        expect(firstEntry).toHaveProperty('date');
        expect(firstEntry).toHaveProperty('description');
        expect(firstEntry).toHaveProperty('changes');
        expect(Array.isArray(firstEntry.changes)).toBe(true);
      }
    });
  });

  describe('GET /docs', () => {
    it('should return API documentation', async () => {
      const response = await request(app).get('/api/docs');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('markdown');
      expect(typeof response.body.markdown).toBe('string');
    });

    it('should return content-type application/json', async () => {
      const response = await request(app).get('/api/docs');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should include documentation for GraphQL endpoint', async () => {
      const response = await request(app).get('/api/docs');

      expect(response.body.markdown).toContain('GraphQL');
      expect(response.body.markdown).toContain('/gql');
    });

    it('should include documentation for REST endpoints', async () => {
      const response = await request(app).get('/api/docs');

      expect(response.body.markdown).toContain('REST');
      expect(response.body.markdown).toContain('/api');
    });

    it('should include username management documentation', async () => {
      const response = await request(app).get('/api/docs');

      expect(response.body.markdown).toContain('Username Management');
      expect(response.body.markdown).toContain('validateUsername');
      expect(response.body.markdown).toContain('checkUsernameAvailability');
      expect(response.body.markdown).toContain('createUsername');
      expect(response.body.markdown).toContain('getEmailByUsername');
    });

    it('should include feature flags documentation', async () => {
      const response = await request(app).get('/api/docs');

      expect(response.body.markdown).toContain('Feature Flags');
      expect(response.body.markdown).toContain('featureFlags');
      expect(response.body.markdown).toContain('updateFeatureFlag');
    });

    it('should include notifications documentation', async () => {
      const response = await request(app).get('/api/docs');

      expect(response.body.markdown).toContain('Notifications');
      expect(response.body.markdown).toContain('/api/notifications/broadcast');
      expect(response.body.markdown).toContain('/api/notifications/send');
    });

    it('should include guidance on when to use GraphQL vs REST', async () => {
      const response = await request(app).get('/api/docs');

      expect(response.body.markdown).toContain('When to Use Which');
      expect(response.body.markdown).toContain('Choose GraphQL when');
      expect(response.body.markdown).toContain('Choose REST when');
    });

    it('should reference HYBRID_API_ARCHITECTURE.md', async () => {
      const response = await request(app).get('/api/docs');

      expect(response.body.markdown).toContain('HYBRID_API_ARCHITECTURE.md');
    });

    it('should not have leading or trailing whitespace', async () => {
      const response = await request(app).get('/api/docs');

      const markdown = response.body.markdown;
      expect(markdown).toBe(markdown.trim());
    });
  });

  describe('Invalid routes', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/nonexistent');

      expect(response.status).toBe(404);
    });
  });
});
