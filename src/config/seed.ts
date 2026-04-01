import { v4 as uuid } from 'uuid';
import bcryptjs from 'bcryptjs';
import db, { initializeDatabase } from './database';
import { env } from './env';

initializeDatabase();

const users = [
  { id: uuid(), email: 'admin@zorvyn.com', password: 'Admin@123', name: 'Admin User', role: 'admin' },
  { id: uuid(), email: 'analyst@zorvyn.com', password: 'Analyst@123', name: 'Analyst User', role: 'analyst' },
  { id: uuid(), email: 'viewer@zorvyn.com', password: 'Viewer@123', name: 'Viewer User', role: 'viewer' },
];

const categories = ['Salary', 'Freelance', 'Investments', 'Rent', 'Utilities', 'Food', 'Transport', 'Entertainment', 'Healthcare', 'Education'];

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)
`);

const insertRecord = db.prepare(`
  INSERT INTO financial_records (id, user_id, amount, type, category, date, description) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const seedTransaction = db.transaction(() => {
  // Seed users
  for (const user of users) {
    const hashed = bcryptjs.hashSync(user.password, env.bcryptRounds);
    insertUser.run(user.id, user.email, hashed, user.name, user.role);
  }

  const adminId = db.prepare(`SELECT id FROM users WHERE email = ?`).get('admin@zorvyn.com') as { id: string };

  // Seed 30 sample financial records
  for (let i = 0; i < 30; i++) {
    const type = Math.random() > 0.4 ? 'income' : 'expense';
    const amount = parseFloat((Math.random() * 5000 + 100).toFixed(2));
    const category = categories[Math.floor(Math.random() * categories.length)];
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const month = String(Math.floor(Math.random() * 6) + 1).padStart(2, '0');
    const date = `2026-${month}-${day}`;
    const description = `${type === 'income' ? 'Received' : 'Paid'} for ${category.toLowerCase()}`;

    insertRecord.run(uuid(), adminId.id, amount, type, category, date, description);
  }

  console.log('Seed completed: 3 users + 30 financial records');
});

seedTransaction();
