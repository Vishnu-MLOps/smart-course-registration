import express from 'express';
import {
  getProgress,
  getRecommendations,
  getTimetable,
} from '../controllers/academicController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/progress', getProgress);
router.get('/recommendations', getRecommendations);
router.get('/timetable', getTimetable);

export default router;
