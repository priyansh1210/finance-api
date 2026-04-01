import { Request, Response } from 'express';
import * as usersService from './users.service';
import { success, created, paginated } from '../../utils/response';
import { getParsedQuery } from '../../middleware/validate';

export function list(req: Request, res: Response): void {
  const result = usersService.listUsers(getParsedQuery(req));
  paginated(res, result.users, result.total, result.page, result.limit);
}

export function getById(req: Request, res: Response): void {
  const user = usersService.getUserById(req.params.id as string);
  success(res, user);
}

export function create(req: Request, res: Response): void {
  const user = usersService.createUser(req.body);
  created(res, user);
}

export function update(req: Request, res: Response): void {
  const user = usersService.updateUser(req.params.id as string, req.body, req.user!.userId);
  success(res, user);
}

export function remove(req: Request, res: Response): void {
  usersService.deleteUser(req.params.id as string, req.user!.userId);
  res.status(204).send();
}
