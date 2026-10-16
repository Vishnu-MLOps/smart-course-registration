import express from 'express';
import {
  getSections,
  getSectionById,
  createSection,
  updateSection,
} from '../controllers/sectionController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getSections);
router.get('/:id', authenticate, getSectionById);

// Admin-only endpoints
router.post('/', authenticate, authorize('admin'), createSection);
router.put('/:id', authenticate, authorize('admin'), updateSection);

export default router;
