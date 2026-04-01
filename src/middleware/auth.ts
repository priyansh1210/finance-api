import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import db from '../config/database';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return next(new UnauthorizedError('Missing or invalid authorization header'));
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;

    const user = db.prepare('SELECT id, status FROM users WHERE id = ?').get(payload.userId) as any;
    if (!user) return next(new UnauthorizedError('User no longer exists'));
    if (user.status !== 'active') return next(new ForbiddenError('Account is inactive'));

    req.user = payload;
    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

type Role = 'viewer' | 'analyst' | 'admin';

const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 1,
  analyst: 2,
  admin: 3,
};

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new UnauthorizedError());

    const userRole = req.user.role as Role;
    if (!allowedRoles.includes(userRole)) {
      return next(new ForbiddenError(
        `Role '${userRole}' is not authorized. Required: ${allowedRoles.join(', ')}`,
      ));
    }

    next();
  };
}

export function requireMinRole(minRole: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new UnauthorizedError());

    const userLevel = ROLE_HIERARCHY[req.user.role as Role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole];

    if (userLevel < requiredLevel) {
      return next(new ForbiddenError(
        `Minimum role '${minRole}' required. Your role: '${req.user.role}'`,
      ));
    }

    next();
  };
}
