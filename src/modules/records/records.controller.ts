import { Request, Response } from 'express';
import * as recordsService from './records.service';
import { success, created, paginated } from '../../utils/response';
import { getParsedQuery } from '../../middleware/validate';

export function list(req: Request, res: Response): void {
  const result = recordsService.listRecords(getParsedQuery(req));
  paginated(res, result.records, result.total, result.page, result.limit);
}

export function getById(req: Request, res: Response): void {
  const record = recordsService.getRecordById(req.params.id as string);
  success(res, record);
}

export function create(req: Request, res: Response): void {
  const record = recordsService.createRecord(req.body, req.user!.userId);
  created(res, record);
}

export function update(req: Request, res: Response): void {
  const record = recordsService.updateRecord(req.params.id as string, req.body);
  success(res, record);
}

export function remove(req: Request, res: Response): void {
  recordsService.deleteRecord(req.params.id as string);
  res.status(204).send();
}
