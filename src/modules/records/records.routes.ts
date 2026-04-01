import { Router } from 'express';
import * as recordsController from './records.controller';
import { authenticate, authorize, requireMinRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createRecordSchema, updateRecordSchema, listRecordsQuerySchema } from './records.schema';

const router = Router();

router.use(authenticate);

// View records — all authenticated roles (viewer, analyst, admin)
router.get('/', validate(listRecordsQuerySchema, 'query'), recordsController.list);
router.get('/:id', recordsController.getById);

// Create, update, delete — admin only
router.post('/', authorize('admin'), validate(createRecordSchema), recordsController.create);
router.put('/:id', authorize('admin'), validate(updateRecordSchema), recordsController.update);
router.delete('/:id', authorize('admin'), recordsController.remove);

export default router;
