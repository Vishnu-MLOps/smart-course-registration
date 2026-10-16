import express from 'express';
import {
  getDashboardStats,
  getStudents,
  getAllEnrollments,
  getStudentAcademicRecords,
  createOrUpdateAcademicRecord,
  getAcademicRules,
  updateAcademicRule,
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes are strictly administrator only
router.use(authenticate, authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/students', getStudents);
router.get('/students/:studentId/academic-records', getStudentAcademicRecords);
router.post('/academic-records', createOrUpdateAcademicRecord);
router.get('/enrollments', getAllEnrollments);
router.get('/rules', getAcademicRules);
router.put('/rules/:id', updateAcademicRule);

export default router;
