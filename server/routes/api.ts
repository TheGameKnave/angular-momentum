import { Request, Response, NextFunction, Router } from 'express';
const router = Router();
let features = {
  'App Version': true,
  'Environment': true,
  'API': true,
  'IndexedDB': true,
}

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.send({
    message: 'api works'
  });
});

router.get('/flags', (req: Request, res: Response, next: NextFunction) => {
  res.send(features);
});


export default router;