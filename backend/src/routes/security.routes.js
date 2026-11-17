import { Router } from 'express';
import { getSecurityOverview } from '../controllers/security.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

export const securityRouter = Router();

securityRouter.use(authenticateToken);

// GET /api/security/overview
securityRouter.get('/overview', getSecurityOverview);
