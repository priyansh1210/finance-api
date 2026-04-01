import { Request, Response } from 'express';
import * as dashboardService from './dashboard.service';
import { success } from '../../utils/response';

export function overview(req: Request, res: Response): void {
  const data = dashboardService.getOverview();
  success(res, data);
}

export function summary(req: Request, res: Response): void {
  const data = dashboardService.getSummary();
  success(res, data);
}

export function categoryTotals(req: Request, res: Response): void {
  const data = dashboardService.getCategoryTotals();
  success(res, data);
}

export function monthlyTrends(req: Request, res: Response): void {
  const months = req.query.months ? parseInt(req.query.months as string, 10) : 12;
  const data = dashboardService.getMonthlyTrends(months);
  success(res, data);
}

export function recentActivity(req: Request, res: Response): void {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const data = dashboardService.getRecentActivity(limit);
  success(res, data);
}
