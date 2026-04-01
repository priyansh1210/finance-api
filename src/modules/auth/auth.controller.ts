import { Request, Response } from 'express';
import * as authService from './auth.service';
import { created, success } from '../../utils/response';

export function register(req: Request, res: Response): void {
  const result = authService.register(req.body);
  created(res, result);
}

export function login(req: Request, res: Response): void {
  const result = authService.login(req.body);
  success(res, result);
}

export function me(req: Request, res: Response): void {
  success(res, { user: req.user });
}
