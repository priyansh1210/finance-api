import { Router } from 'express';
import * as usersController from './users.controller';
import { authenticate, authorize, requireMinRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createUserSchema, updateUserSchema, listUsersQuerySchema } from './users.schema';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// List users — admin and analyst can view
router.get('/', requireMinRole('analyst'), validate(listUsersQuerySchema, 'query'), usersController.list);

// Get user by ID — admin and analyst
router.get('/:id', requireMinRole('analyst'), usersController.getById);

// Create user — admin only
router.post('/', authorize('admin'), validate(createUserSchema), usersController.create);

// Update user — admin only
router.put('/:id', authorize('admin'), validate(updateUserSchema), usersController.update);

// Delete user — admin only
router.delete('/:id', authorize('admin'), usersController.remove);

export default router;
