import { env } from '../src/config/env';
import { initializeDatabase } from '../src/config/database';

// Initialize DB before tests
initializeDatabase();

const BASE = `http://localhost:${env.port}/api`;
let adminToken = '';
let viewerToken = '';
let analystToken = '';
let createdRecordId = '';
let createdUserId = '';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
    passed++;
  } else {
    console.log(`  \x1b[31m✗\x1b[0m ${message}`);
    failed++;
  }
}

async function api(
  method: string,
  path: string,
  body?: any,
  token?: string,
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function testAuth() {
  console.log('\n\x1b[1mAuth Module\x1b[0m');

  // Register with unique email
  const uniqueEmail = `test-${Date.now()}@zorvyn.com`;
  const reg = await api('POST', '/auth/register', {
    email: uniqueEmail,
    password: 'Test@1234',
    name: 'Test User',
  });
  assert(reg.status === 201, 'Register returns 201');
  assert(reg.data.data?.token?.length > 0, 'Register returns a JWT token');

  // Duplicate register
  const dup = await api('POST', '/auth/register', {
    email: uniqueEmail,
    password: 'Test@1234',
    name: 'Test User',
  });
  assert(dup.status === 409, 'Duplicate email returns 409');

  // Login
  const login = await api('POST', '/auth/login', {
    email: 'admin@zorvyn.com',
    password: 'Admin@123',
  });
  assert(login.status === 200, 'Admin login returns 200');
  adminToken = login.data.data.token;

  const viewerLogin = await api('POST', '/auth/login', {
    email: 'viewer@zorvyn.com',
    password: 'Viewer@123',
  });
  viewerToken = viewerLogin.data.data.token;

  const analystLogin = await api('POST', '/auth/login', {
    email: 'analyst@zorvyn.com',
    password: 'Analyst@123',
  });
  analystToken = analystLogin.data.data.token;

  // Bad login
  const bad = await api('POST', '/auth/login', {
    email: 'admin@zorvyn.com',
    password: 'wrong',
  });
  assert(bad.status === 401, 'Wrong password returns 401');

  // Me endpoint
  const me = await api('GET', '/auth/me', undefined, adminToken);
  assert(me.status === 200, '/auth/me returns user info');
  assert(me.data.data.user.role === 'admin', '/auth/me shows admin role');

  // No token
  const noAuth = await api('GET', '/auth/me');
  assert(noAuth.status === 401, 'No token returns 401');

  // Validation
  const badReg = await api('POST', '/auth/register', {
    email: 'not-an-email',
    password: '123',
    name: '',
  });
  assert(badReg.status === 400, 'Invalid input returns 400');
}

async function testRecords() {
  console.log('\n\x1b[1mFinancial Records Module\x1b[0m');

  // List records
  const list = await api('GET', '/records?limit=5', undefined, adminToken);
  assert(list.status === 200, 'List records returns 200');
  assert(Array.isArray(list.data.data), 'Returns array of records');
  assert(list.data.pagination?.totalPages > 0, 'Returns pagination info');

  // Filter by type
  const incomeOnly = await api('GET', '/records?type=income&limit=50', undefined, adminToken);
  assert(incomeOnly.status === 200, 'Filter by type works');
  const allIncome = incomeOnly.data.data.every((r: any) => r.type === 'income');
  assert(allIncome, 'All filtered records are income');

  // Create record (admin)
  const create = await api('POST', '/records', {
    amount: 2500,
    type: 'income',
    category: 'Bonus',
    date: '2026-04-01',
    description: 'Quarterly bonus',
  }, adminToken);
  assert(create.status === 201, 'Admin can create record');
  createdRecordId = create.data.data.id;

  // Create record (viewer — forbidden)
  const viewerCreate = await api('POST', '/records', {
    amount: 100,
    type: 'expense',
    category: 'Test',
    date: '2026-04-01',
  }, viewerToken);
  assert(viewerCreate.status === 403, 'Viewer cannot create records (403)');

  // Get by ID
  const getOne = await api('GET', `/records/${createdRecordId}`, undefined, adminToken);
  assert(getOne.status === 200, 'Get record by ID works');
  assert(getOne.data.data.amount === 2500, 'Record amount matches');

  // Update record
  const update = await api('PUT', `/records/${createdRecordId}`, {
    amount: 3000,
    description: 'Updated bonus',
  }, adminToken);
  assert(update.status === 200, 'Admin can update record');
  assert(update.data.data.amount === 3000, 'Amount updated correctly');

  // Viewer cannot update
  const viewerUpdate = await api('PUT', `/records/${createdRecordId}`, {
    amount: 1,
  }, viewerToken);
  assert(viewerUpdate.status === 403, 'Viewer cannot update records');

  // Delete record (soft delete)
  const del = await api('DELETE', `/records/${createdRecordId}`, undefined, adminToken);
  assert(del.status === 204, 'Admin can delete record');

  // Verify soft deleted — should be 404
  const getDeleted = await api('GET', `/records/${createdRecordId}`, undefined, adminToken);
  assert(getDeleted.status === 404, 'Soft deleted record returns 404');

  // Not found
  const notFound = await api('GET', '/records/nonexistent-id', undefined, adminToken);
  assert(notFound.status === 404, 'Non-existent record returns 404');
}

async function testUsers() {
  console.log('\n\x1b[1mUser Management Module\x1b[0m');

  // List users (admin)
  const list = await api('GET', '/users', undefined, adminToken);
  assert(list.status === 200, 'Admin can list users');

  // List users (viewer — forbidden, needs analyst+)
  const viewerList = await api('GET', '/users', undefined, viewerToken);
  assert(viewerList.status === 403, 'Viewer cannot list users');

  // Analyst can list
  const analystList = await api('GET', '/users', undefined, analystToken);
  assert(analystList.status === 200, 'Analyst can list users');

  // Create user (admin)
  const create = await api('POST', '/users', {
    email: 'newuser@zorvyn.com',
    password: 'NewUser@123',
    name: 'New User',
    role: 'viewer',
  }, adminToken);
  assert(create.status === 201, 'Admin can create user');
  createdUserId = create.data.data.id;
  assert(!create.data.data.password, 'Password is not exposed in response');

  // Create user (viewer — forbidden)
  const viewerCreate = await api('POST', '/users', {
    email: 'another@zorvyn.com',
    password: 'Another@123',
    name: 'Another User',
  }, viewerToken);
  assert(viewerCreate.status === 403, 'Viewer cannot create users');

  // Update user role
  const update = await api('PUT', `/users/${createdUserId}`, {
    role: 'analyst',
    status: 'inactive',
  }, adminToken);
  assert(update.status === 200, 'Admin can update user');
  assert(update.data.data.role === 'analyst', 'Role updated correctly');
  assert(update.data.data.status === 'inactive', 'Status updated correctly');

  // Delete user
  const del = await api('DELETE', `/users/${createdUserId}`, undefined, adminToken);
  assert(del.status === 204, 'Admin can delete user');

  // Delete non-existent
  const delAgain = await api('DELETE', `/users/${createdUserId}`, undefined, adminToken);
  assert(delAgain.status === 404, 'Deleting non-existent user returns 404');
}

async function testDashboard() {
  console.log('\n\x1b[1mDashboard Module\x1b[0m');

  const overview = await api('GET', '/dashboard/overview', undefined, adminToken);
  assert(overview.status === 200, 'Overview returns 200');
  assert(typeof overview.data.data.summary.total_income === 'number', 'Summary has total_income');
  assert(typeof overview.data.data.summary.net_balance === 'number', 'Summary has net_balance');
  assert(Array.isArray(overview.data.data.categoryTotals), 'Has category totals');
  assert(Array.isArray(overview.data.data.monthlyTrends), 'Has monthly trends');
  assert(Array.isArray(overview.data.data.recentActivity), 'Has recent activity');

  const summary = await api('GET', '/dashboard/summary', undefined, viewerToken);
  assert(summary.status === 200, 'Viewer can access summary');

  const trends = await api('GET', '/dashboard/trends?months=3', undefined, analystToken);
  assert(trends.status === 200, 'Analyst can access trends');
  assert(trends.data.data.length <= 3, 'Trends limited to 3 months');

  const categories = await api('GET', '/dashboard/categories', undefined, adminToken);
  assert(categories.status === 200, 'Category totals returns 200');

  const recent = await api('GET', '/dashboard/recent?limit=5', undefined, adminToken);
  assert(recent.status === 200, 'Recent activity returns 200');
  assert(recent.data.data.length <= 5, 'Recent activity limited to 5');
}

async function testEdgeCases() {
  console.log('\n\x1b[1mEdge Cases & Validation\x1b[0m');

  // Health check
  const health = await api('GET', '/health');
  assert(health.status === 200, 'Health check works');

  // 404 route
  const notFound = await fetch(`${BASE}/nonexistent`);
  assert(notFound.status === 404, 'Unknown route returns 404');

  // Invalid JSON
  const badJson = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid json}',
  });
  assert(badJson.status >= 400, 'Invalid JSON returns error status');

  // Empty body
  const emptyBody = await api('POST', '/auth/login', {});
  assert(emptyBody.status === 400, 'Empty login body returns 400');
}

async function main() {
  console.log('\x1b[1m\x1b[34m╔══════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[1m\x1b[34m║   Zorvyn Finance API — Test Suite    ║\x1b[0m');
  console.log('\x1b[1m\x1b[34m╚══════════════════════════════════════╝\x1b[0m');

  try {
    await testAuth();
    await testRecords();
    await testUsers();
    await testDashboard();
    await testEdgeCases();
  } catch (err) {
    console.error('\n\x1b[31mTest suite error:\x1b[0m', err);
    failed++;
  }

  console.log('\n\x1b[1m════════════════════════════════════════\x1b[0m');
  console.log(`  \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m, ${passed + failed} total`);
  console.log('\x1b[1m════════════════════════════════════════\x1b[0m\n');

  process.exit(failed > 0 ? 1 : 0);
}

main();
