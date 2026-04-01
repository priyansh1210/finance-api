import { Router } from 'express';
import * as dashboardController from './dashboard.controller';
import { authenticate, requireMinRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// All dashboard routes require at least viewer role (all authenticated users)
router.get('/overview', dashboardController.overview);
router.get('/summary', dashboardController.summary);
router.get('/categories', dashboardController.categoryTotals);
router.get('/trends', dashboardController.monthlyTrends);
router.get('/recent', dashboardController.recentActivity);

export default router;
