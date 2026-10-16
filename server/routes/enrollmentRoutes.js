import express from 'express';
import {
  registerForSection,
  withdrawFromSection,
  getMyEnrollments,
  checkEligibility,
} from '../controllers/enrollmentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', registerForSection);
router.delete('/:id', withdrawFromSection);
router.get('/me', getMyEnrollments);
router.get('/check-eligibility', checkEligibility);

export default router;
