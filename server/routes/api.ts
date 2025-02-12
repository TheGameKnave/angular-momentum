import { Request, Response, NextFunction, Router } from 'express';
const lowDBService = require('../services/lowDBService');
const router = Router();

// Default route
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.send({
    message: 'API works',
  });
});

// GET: Fetch feature flags (initial load)
router.get('/flags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const featureFlags = await lowDBService.readFeatureFlags();
    // res.send({})
    res.send(featureFlags);
  } catch (err) {
    next(err);
  }
});

// PUT: Update feature flags
router.put('/flags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await lowDBService.writeFeatureFlags(req.body);
    const updatedFeatureFlags = await lowDBService.readFeatureFlags();
    res.send(updatedFeatureFlags);
  } catch (err) {
    next(err);
  }
});

export default router;
