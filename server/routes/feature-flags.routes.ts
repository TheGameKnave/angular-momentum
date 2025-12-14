import { Router, Request, Response } from 'express';
import { readFeatureFlags, writeFeatureFlags } from '../services/lowDBService';

const router = Router();

/**
 * GET /api/feature-flags
 * Retrieves all feature flags.
 *
 * Response:
 * [
 *   { "key": "darkMode", "value": true },
 *   { "key": "newFeature", "value": false }
 * ]
 */
router.get('/', (req: Request, res: Response) => {
  const featureFlags = readFeatureFlags();
  const flags = Object.keys(featureFlags).map(key => ({
    key,
    value: featureFlags[key]
  }));
  res.json(flags);
});

/**
 * GET /api/feature-flags/:key
 * Retrieves a specific feature flag value.
 *
 * Response:
 * {
 *   "key": "darkMode",
 *   "value": true
 * }
 */
router.get('/:key', (req: Request, res: Response) => {
  const { key } = req.params;
  const featureFlags = readFeatureFlags();

  if (!(key in featureFlags)) {
    return res.status(404).json({
      error: `Feature flag '${key}' not found`
    });
  }

  res.json({
    key,
    value: featureFlags[key]
  });
});

/**
 * PUT /api/feature-flags/:key
 * Updates a feature flag value and broadcasts via WebSocket.
 *
 * Request body:
 * {
 *   "value": true
 * }
 *
 * Response:
 * {
 *   "key": "darkMode",
 *   "value": true
 * }
 */
router.put('/:key', async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;

  if (typeof value !== 'boolean') {
    return res.status(400).json({
      error: 'Value must be a boolean'
    });
  }

  const updatedFeatures = await writeFeatureFlags({ [key]: value });

  // Broadcast update via WebSocket
  const io = req.app.get('io');
  if (io) {
    io.emit('update-feature-flags', updatedFeatures);
  }

  res.json({ key, value });
});

/**
 * DELETE /api/feature-flags/:key
 * Deletes a feature flag.
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Feature flag 'darkMode' deleted"
 * }
 */
router.delete('/:key', async (req: Request, res: Response) => {
  const { key } = req.params;
  const featureFlags = readFeatureFlags();

  if (!(key in featureFlags)) {
    return res.status(404).json({
      error: `Feature flag '${key}' not found`
    });
  }

  const remainingFlags = { ...featureFlags };
  delete remainingFlags[key];
  await writeFeatureFlags(remainingFlags);

  // Broadcast update via WebSocket
  const io = req.app.get('io');
  if (io) {
    io.emit('update-feature-flags', remainingFlags);
  }

  res.json({
    success: true,
    message: `Feature flag '${key}' deleted`
  });
});

export default router;
