const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Zorvyn Finance API',
    version: '1.0.0',
    description:
      'A role-based personal finance tracking REST API. Supports user management, financial records CRUD, dashboard analytics, and role-based access control.',
    contact: { name: 'Priyansh', url: 'https://github.com/priyansh1210' },
  },
  servers: [
    { url: '/api', description: 'API base path' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Login or register to get a JWT token, then use it here.',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['viewer', 'analyst', 'admin'] },
          status: { type: 'string', enum: ['active', 'inactive'] },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      FinancialRecord: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          amount: { type: 'number' },
          type: { type: 'string', enum: ['income', 'expense'] },
          category: { type: 'string' },
          date: { type: 'string', format: 'date' },
          description: { type: 'string', nullable: true },
          is_deleted: { type: 'integer', enum: [0, 1] },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid JWT token',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } } } },
      },
      Forbidden: {
        description: 'Insufficient permissions for this action',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } } } },
      },
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } } } },
      },
      ValidationError: {
        description: 'Input validation failed',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: [{ field: 'email', message: 'Invalid email address' }] } } } },
      },
    },
  },
  tags: [
    { name: 'Health', description: 'Server health check' },
    { name: 'Auth', description: 'Registration, login, and token-based authentication' },
    { name: 'Records', description: 'Financial records CRUD with filtering and pagination' },
    { name: 'Users', description: 'User management (admin/analyst restricted)' },
    { name: 'Dashboard', description: 'Aggregated financial analytics and summaries' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Server is running',
            content: { 'application/json': { example: { status: 'ok', timestamp: '2026-04-01T12:00:00.000Z' } } },
          },
        },
      },
    },

    // ── Auth ──
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', minLength: 8, example: 'Secure@123', description: 'Min 8 chars, 1 uppercase, 1 number, 1 special char' },
                  name: { type: 'string', example: 'John Doe' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: { 'application/json': { example: { success: true, data: { user: { id: 'uuid', email: 'user@example.com', name: 'John Doe', role: 'viewer', status: 'active' }, token: 'eyJhbGciOi...' } } } },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          409: { description: 'Email already registered', content: { 'application/json': { example: { success: false, error: { code: 'CONFLICT', message: 'Email is already registered' } } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@zorvyn.com' },
                  password: { type: 'string', example: 'Admin@123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: { 'application/json': { example: { success: true, data: { user: { id: 'uuid', email: 'admin@zorvyn.com', name: 'Admin User', role: 'admin', status: 'active' }, token: 'eyJhbGciOi...' } } } },
          },
          401: { description: 'Invalid credentials', content: { 'application/json': { example: { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } } } } },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated user',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user info',
            content: { 'application/json': { example: { success: true, data: { user: { userId: 'uuid', email: 'admin@zorvyn.com', role: 'admin' } } } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Records ──
    '/records': {
      get: {
        tags: ['Records'],
        summary: 'List financial records (paginated, filterable)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['income', 'expense'] } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'date_from', in: 'query', schema: { type: 'string', format: 'date' }, description: 'YYYY-MM-DD' },
          { name: 'date_to', in: 'query', schema: { type: 'string', format: 'date' }, description: 'YYYY-MM-DD' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search in description and category' },
          { name: 'sort_by', in: 'query', schema: { type: 'string', enum: ['date', 'amount', 'created_at'], default: 'date' } },
          { name: 'sort_order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          200: {
            description: 'Paginated list of records',
            content: { 'application/json': { example: { success: true, data: [{ id: 'uuid', amount: 2500, type: 'income', category: 'Salary', date: '2026-04-01', description: 'Monthly salary' }], pagination: { page: 1, limit: 20, total: 45, totalPages: 3 } } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Records'],
        summary: 'Create a financial record (admin only)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'type', 'category', 'date'],
                properties: {
                  amount: { type: 'number', example: 2500 },
                  type: { type: 'string', enum: ['income', 'expense'], example: 'income' },
                  category: { type: 'string', example: 'Bonus' },
                  date: { type: 'string', format: 'date', example: '2026-04-01' },
                  description: { type: 'string', example: 'Quarterly bonus' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Record created', content: { 'application/json': { example: { success: true, data: { id: 'uuid', amount: 2500, type: 'income', category: 'Bonus', date: '2026-04-01', description: 'Quarterly bonus' } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/records/{id}': {
      get: {
        tags: ['Records'],
        summary: 'Get a record by ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Record details', content: { 'application/json': { schema: { $ref: '#/components/schemas/FinancialRecord' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Records'],
        summary: 'Update a record (admin only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  amount: { type: 'number', example: 3000 },
                  type: { type: 'string', enum: ['income', 'expense'] },
                  category: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Record updated' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Records'],
        summary: 'Soft-delete a record (admin only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Record soft-deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Users ──
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List users (analyst+ role required)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['viewer', 'analyst', 'admin'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive'] } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search in name and email' },
        ],
        responses: {
          200: { description: 'Paginated user list (password excluded)' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Create a user (admin only)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'newuser@zorvyn.com' },
                  password: { type: 'string', example: 'NewUser@123' },
                  name: { type: 'string', example: 'New User' },
                  role: { type: 'string', enum: ['viewer', 'analyst', 'admin'], default: 'viewer' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User created (password excluded from response)' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID (analyst+ role required)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'User details (password excluded)' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update a user (admin only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  role: { type: 'string', enum: ['viewer', 'analyst', 'admin'] },
                  status: { type: 'string', enum: ['active', 'inactive'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User updated' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete a user (admin only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'User deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Dashboard ──
    '/dashboard/overview': {
      get: {
        tags: ['Dashboard'],
        summary: 'Full dashboard overview (summary + categories + trends + recent)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Complete dashboard data',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    summary: { total_income: 45230.50, total_expenses: 18420.75, net_balance: 26809.75, record_count: 30 },
                    categoryTotals: [{ category: 'Salary', type: 'income', total: 25000, count: 6 }],
                    monthlyTrends: [{ month: '2026-01', income: 8500, expenses: 3200, net: 5300 }],
                    recentActivity: [{ id: 'uuid', amount: 2500, type: 'income', category: 'Salary', date: '2026-04-01' }],
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Financial summary (income, expenses, balance, count)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Summary totals', content: { 'application/json': { example: { success: true, data: { total_income: 45230.50, total_expenses: 18420.75, net_balance: 26809.75, record_count: 30 } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/dashboard/categories': {
      get: {
        tags: ['Dashboard'],
        summary: 'Totals grouped by category and type',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Category breakdown', content: { 'application/json': { example: { success: true, data: [{ category: 'Salary', type: 'income', total: 25000, count: 6 }] } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/dashboard/trends': {
      get: {
        tags: ['Dashboard'],
        summary: 'Monthly income/expense trends',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'months', in: 'query', schema: { type: 'integer', default: 12 }, description: 'Number of months to return' }],
        responses: {
          200: { description: 'Monthly trend data', content: { 'application/json': { example: { success: true, data: [{ month: '2026-01', income: 8500, expenses: 3200, net: 5300 }] } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/dashboard/recent': {
      get: {
        tags: ['Dashboard'],
        summary: 'Recent financial activity',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10 }, description: 'Number of records to return' }],
        responses: {
          200: { description: 'Recent records', content: { 'application/json': { example: { success: true, data: [{ id: 'uuid', amount: 2500, type: 'income', category: 'Salary', date: '2026-04-01', description: 'Monthly salary' }] } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
};

export default swaggerDocument;
