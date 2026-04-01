import bcryptjs from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from '../../config/database';
import { env } from '../../config/env';
import { ConflictError, NotFoundError, ForbiddenError } from '../../utils/errors';
import type { CreateUserInput, UpdateUserInput, ListUsersQuery } from './users.schema';

interface UserRow {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function sanitize(user: UserRow) {
  const { password, ...safe } = user;
  return safe;
}

export function listUsers(query: ListUsersQuery) {
  const conditions: string[] = [];
  const params: any[] = [];

  if (query.role) {
    conditions.push('role = ?');
    params.push(query.role);
  }
  if (query.status) {
    conditions.push('status = ?');
    params.push(query.status);
  }
  if (query.search) {
    conditions.push('(name LIKE ? OR email LIKE ?)');
    params.push(`%${query.search}%`, `%${query.search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (query.page - 1) * query.limit;

  const total = (db.prepare(`SELECT COUNT(*) as count FROM users ${where}`).get(...params) as any).count;
  const users = db.prepare(
    `SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  ).all(...params, query.limit, offset) as UserRow[];

  return { users: users.map(sanitize), total, page: query.page, limit: query.limit };
}

export function getUserById(id: string) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  if (!user) throw new NotFoundError('User');
  return sanitize(user);
}

export function createUser(input: CreateUserInput) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(input.email);
  if (existing) throw new ConflictError('Email is already registered');

  const id = uuid();
  const hashed = bcryptjs.hashSync(input.password, env.bcryptRounds);

  db.prepare(
    'INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
  ).run(id, input.email, hashed, input.name, input.role);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
  return sanitize(user);
}

export function updateUser(id: string, input: UpdateUserInput, requesterId: string) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  if (!user) throw new NotFoundError('User');

  // Prevent admin from deactivating themselves
  if (id === requesterId && input.status === 'inactive') {
    throw new ForbiddenError('Cannot deactivate your own account');
  }
  if (id === requesterId && input.role && input.role !== user.role) {
    throw new ForbiddenError('Cannot change your own role');
  }

  const fields: string[] = [];
  const params: any[] = [];

  if (input.name !== undefined) { fields.push('name = ?'); params.push(input.name); }
  if (input.role !== undefined) { fields.push('role = ?'); params.push(input.role); }
  if (input.status !== undefined) { fields.push('status = ?'); params.push(input.status); }

  if (fields.length === 0) return sanitize(user);

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
  return sanitize(updated);
}

export function deleteUser(id: string, requesterId: string) {
  if (id === requesterId) throw new ForbiddenError('Cannot delete your own account');

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) throw new NotFoundError('User');

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}
