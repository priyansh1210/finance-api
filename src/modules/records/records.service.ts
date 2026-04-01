import { v4 as uuid } from 'uuid';
import db from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import type { CreateRecordInput, UpdateRecordInput, ListRecordsQuery } from './records.schema';

interface RecordRow {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  category: string;
  date: string;
  description: string | null;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

const BASE_SELECT = 'SELECT * FROM financial_records WHERE is_deleted = 0';

export function listRecords(query: ListRecordsQuery) {
  const conditions: string[] = ['is_deleted = 0'];
  const params: any[] = [];

  if (query.type) {
    conditions.push('type = ?');
    params.push(query.type);
  }
  if (query.category) {
    conditions.push('category = ?');
    params.push(query.category);
  }
  if (query.date_from) {
    conditions.push('date >= ?');
    params.push(query.date_from);
  }
  if (query.date_to) {
    conditions.push('date <= ?');
    params.push(query.date_to);
  }
  if (query.search) {
    conditions.push('(description LIKE ? OR category LIKE ?)');
    params.push(`%${query.search}%`, `%${query.search}%`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const orderBy = `ORDER BY ${query.sort_by} ${query.sort_order}`;
  const offset = (query.page - 1) * query.limit;

  const total = (db.prepare(`SELECT COUNT(*) as count FROM financial_records ${where}`).get(...params) as any).count;
  const records = db.prepare(
    `SELECT * FROM financial_records ${where} ${orderBy} LIMIT ? OFFSET ?`,
  ).all(...params, query.limit, offset) as RecordRow[];

  return { records, total, page: query.page, limit: query.limit };
}

export function getRecordById(id: string) {
  const record = db.prepare(`${BASE_SELECT} AND id = ?`).get(id) as RecordRow | undefined;
  if (!record) throw new NotFoundError('Financial record');
  return record;
}

export function createRecord(input: CreateRecordInput, userId: string) {
  const id = uuid();

  db.prepare(
    `INSERT INTO financial_records (id, user_id, amount, type, category, date, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, input.amount, input.type, input.category, input.date, input.description || null);

  return db.prepare('SELECT * FROM financial_records WHERE id = ?').get(id) as RecordRow;
}

export function updateRecord(id: string, input: UpdateRecordInput) {
  const existing = db.prepare(`${BASE_SELECT} AND id = ?`).get(id) as RecordRow | undefined;
  if (!existing) throw new NotFoundError('Financial record');

  const fields: string[] = [];
  const params: any[] = [];

  if (input.amount !== undefined) { fields.push('amount = ?'); params.push(input.amount); }
  if (input.type !== undefined) { fields.push('type = ?'); params.push(input.type); }
  if (input.category !== undefined) { fields.push('category = ?'); params.push(input.category); }
  if (input.date !== undefined) { fields.push('date = ?'); params.push(input.date); }
  if (input.description !== undefined) { fields.push('description = ?'); params.push(input.description); }

  if (fields.length === 0) return existing;

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE financial_records SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  return db.prepare('SELECT * FROM financial_records WHERE id = ?').get(id) as RecordRow;
}

export function deleteRecord(id: string) {
  const existing = db.prepare(`${BASE_SELECT} AND id = ?`).get(id) as RecordRow | undefined;
  if (!existing) throw new NotFoundError('Financial record');

  // Soft delete
  db.prepare("UPDATE financial_records SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?").run(id);
}
