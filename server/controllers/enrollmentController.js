import {
  registerCourse,
  withdrawCourse,
  checkStudentEligibility,
} from '../services/registrationService.js';
import { Enrollment } from '../models/Enrollment.js';

export const registerForSection = async (req, res, next) => {
  try {
    const { sectionId } = req.body;
    if (!sectionId) {
      return res.status(400).json({
        success: false,
        message: 'sectionId is required for registration.',
      });
    }

    const enrollment = await registerCourse(req.user, sectionId);

    res.status(201).json({
      success: true,
      message: 'Course registration successful.',
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

export const withdrawFromSection = async (req, res, next) => {
  try {
    const enrollment = await withdrawCourse(req.user, req.params.id);

    res.json({
      success: true,
      message: 'Course withdrawal successful. Your seat has been released.',
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyEnrollments = async (req, res, next) => {
  try {
    const term = req.query.academicTerm || 'Fall 2026';

    const enrollments = await Enrollment.find({
      studentId: req.user._id,
      academicTerm: term,
      status: 'registered',
    })
      .populate('courseId')
      .populate('sectionId')
      .sort({ registrationDate: -1 });

    const totalCredits = enrollments.reduce((sum, enr) => sum + (enr.courseId?.credits || 0), 0);

    res.json({
      success: true,
      count: enrollments.length,
      totalCredits,
      data: enrollments,
    });
  } catch (error) {
    next(error);
  }
};

export const checkEligibility = async (req, res, next) => {
  try {
    const { sectionId } = req.query;
    if (!sectionId) {
      return res.status(400).json({
        success: false,
        message: 'sectionId query parameter is required.',
      });
    }

    const result = await checkStudentEligibility(req.user, sectionId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
