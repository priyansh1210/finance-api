import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

type RequestField = 'body' | 'query' | 'params';

export function validate(schema: z.ZodSchema, field: RequestField = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req[field]);
      if (!result.success) {
        next(result.error);
        return;
      }
      if (field === 'body') {
        req.body = result.data;
      } else {
        (req as any)[`_parsed_${field}`] = result.data;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function getParsedQuery<T = any>(req: Request): T {
  return (req as any)._parsed_query ?? req.query;
}

export function getParsedParams<T = any>(req: Request): T {
  return (req as any)._parsed_params ?? req.params;
}
