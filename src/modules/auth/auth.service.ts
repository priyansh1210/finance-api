import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import db from '../../config/database';
import { env } from '../../config/env';
import { ConflictError, UnauthorizedError } from '../../utils/errors';
import type { RegisterInput, LoginInput } from './auth.schema';
import type { JwtPayload } from '../../middleware/auth';

interface UserRow {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  status: string;
}

function generateToken(user: UserRow): string {
  const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });
}

function sanitizeUser(user: UserRow) {
  const { password, ...safe } = user;
  return safe;
}

export function register(input: RegisterInput) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(input.email);
  if (existing) throw new ConflictError('Email is already registered');

  const id = uuid();
  const hashed = bcryptjs.hashSync(input.password, env.bcryptRounds);

  db.prepare(
    'INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)',
  ).run(id, input.email, hashed, input.name);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
  return { user: sanitizeUser(user), token: generateToken(user) };
}

export function login(input: LoginInput) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(input.email) as UserRow | undefined;
  if (!user) throw new UnauthorizedError('Invalid email or password');
  if (user.status !== 'active') throw new UnauthorizedError('Account is inactive');

  const valid = bcryptjs.compareSync(input.password, user.password);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  return { user: sanitizeUser(user), token: generateToken(user) };
}
