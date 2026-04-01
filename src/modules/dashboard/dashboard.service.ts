import db from '../../config/database';

interface SummaryRow {
  total_income: number;
  total_expenses: number;
  net_balance: number;
  record_count: number;
}

interface CategoryTotal {
  category: string;
  type: string;
  total: number;
  count: number;
}

interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

interface RecentRecord {
  id: string;
  amount: number;
  type: string;
  category: string;
  date: string;
  description: string | null;
  created_at: string;
}

export function getSummary() {
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS net_balance,
      COUNT(*) AS record_count
    FROM financial_records
    WHERE is_deleted = 0
  `).get() as SummaryRow;

  return row;
}

export function getCategoryTotals() {
  const rows = db.prepare(`
    SELECT
      category,
      type,
      ROUND(SUM(amount), 2) AS total,
      COUNT(*) AS count
    FROM financial_records
    WHERE is_deleted = 0
    GROUP BY category, type
    ORDER BY total DESC
  `).all() as CategoryTotal[];

  return rows;
}

export function getMonthlyTrends(months = 12) {
  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', date) AS month,
      ROUND(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 2) AS income,
      ROUND(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 2) AS expenses,
      ROUND(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 2) AS net
    FROM financial_records
    WHERE is_deleted = 0
    GROUP BY month
    ORDER BY month DESC
    LIMIT ?
  `).all(months) as MonthlyTrend[];

  return rows.reverse(); // chronological order
}

export function getRecentActivity(limit = 10) {
  const rows = db.prepare(`
    SELECT id, amount, type, category, date, description, created_at
    FROM financial_records
    WHERE is_deleted = 0
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as RecentRecord[];

  return rows;
}

export function getOverview() {
  return {
    summary: getSummary(),
    categoryTotals: getCategoryTotals(),
    monthlyTrends: getMonthlyTrends(),
    recentActivity: getRecentActivity(),
  };
}
