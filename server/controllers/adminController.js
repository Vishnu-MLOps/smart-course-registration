import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Section } from '../models/Section.js';
import { Enrollment } from '../models/Enrollment.js';
import { AcademicRecord } from '../models/AcademicRecord.js';
import { AcademicRule } from '../models/AcademicRule.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const term = req.query.academicTerm || 'Fall 2026';

    const [totalStudents, totalCourses, totalSections, totalRegistrations] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Course.countDocuments({ active: true }),
      Section.countDocuments({ active: true, academicTerm: term }),
      Enrollment.countDocuments({ academicTerm: term, status: 'registered' }),
    ]);

    // Compute sections nearing capacity (>= 80% full)
    const sections = await Section.find({ active: true, academicTerm: term }).populate('courseId');
    const sectionOccupancy = await Enrollment.aggregate([
      { $match: { academicTerm: term, status: 'registered' } },
      { $group: { _id: '$sectionId', count: { $sum: 1 } } },
    ]);
    const occupancyMap = new Map(sectionOccupancy.map((o) => [o._id.toString(), o.count]));

    const nearCapacitySections = [];
    const departmentBreakdown = {};

    sections.forEach((sec) => {
      const enrolled = occupancyMap.get(sec._id.toString()) || 0;
      const percentage = Math.round((enrolled / sec.capacity) * 100);
      const dept = sec.courseId?.department || 'Information Technology';

      departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + enrolled;

      if (percentage >= 80) {
        nearCapacitySections.push({
          sectionId: sec._id,
          courseCode: sec.courseId?.courseCode,
          courseName: sec.courseId?.courseName,
          sectionCode: sec.sectionCode,
          capacity: sec.capacity,
          enrolled,
          occupancyPercentage: percentage,
          room: sec.room,
          faculty: sec.faculty,
        });
      }
    });

    // Recent registration events
    const recentActivity = await Enrollment.find({ academicTerm: term })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('studentId', 'name email registrationNumber')
      .populate('courseId', 'courseCode courseName')
      .populate('sectionId', 'sectionCode');

    res.json({
      success: true,
      data: {
        totalStudents,
        totalCourses,
        totalSections,
        totalRegistrations,
        nearCapacitySections,
        departmentBreakdown: Object.entries(departmentBreakdown).map(([department, count]) => ({
          department,
          count,
        })),
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getStudents = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'student' }).sort({ name: 1 });

    const studentIds = students.map((s) => s._id);

    const [activeEnrollments, completedRecords] = await Promise.all([
      Enrollment.find({ studentId: { $in: studentIds }, status: 'registered' }).populate('courseId'),
      AcademicRecord.find({ studentId: { $in: studentIds }, status: 'completed' }),
    ]);

    const activeCreditsMap = new Map();
    activeEnrollments.forEach((e) => {
      const sid = e.studentId.toString();
      const credits = e.courseId?.credits || 0;
      activeCreditsMap.set(sid, (activeCreditsMap.get(sid) || 0) + credits);
    });

    const completedCreditsMap = new Map();
    completedRecords.forEach((r) => {
      const sid = r.studentId.toString();
      completedCreditsMap.set(sid, (completedCreditsMap.get(sid) || 0) + r.creditsEarned);
    });

    const enriched = students.map((s) => {
      const sid = s._id.toString();
      return {
        ...s.toObject(),
        registeredCredits: activeCreditsMap.get(sid) || 0,
        completedCredits: completedCreditsMap.get(sid) || 0,
      };
    });

    res.json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllEnrollments = async (req, res, next) => {
  try {
    const { sectionId, courseId, academicTerm, status } = req.query;
    const query = {};

    if (academicTerm) query.academicTerm = academicTerm;
    if (sectionId) query.sectionId = sectionId;
    if (courseId) query.courseId = courseId;
    if (status) query.status = status;

    const enrollments = await Enrollment.find(query)
      .populate('studentId', 'name email registrationNumber department semester')
      .populate('courseId', 'courseCode courseName credits')
      .populate('sectionId', 'sectionCode room faculty schedule')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentAcademicRecords = async (req, res, next) => {
  try {
    const records = await AcademicRecord.find({ studentId: req.params.studentId })
      .populate('courseId')
      .sort({ completedTerm: -1 });

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

export const createOrUpdateAcademicRecord = async (req, res, next) => {
  try {
    const { studentId, courseId, grade, status, creditsEarned, completedTerm } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const calculatedCredits =
      creditsEarned !== undefined ? Number(creditsEarned) : grade === 'F' ? 0 : course.credits;

    const record = await AcademicRecord.findOneAndUpdate(
      { studentId, courseId },
      {
        grade,
        status: status || (grade === 'F' ? 'failed' : 'completed'),
        creditsEarned: calculatedCredits,
        completedTerm: completedTerm || 'Spring 2026',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('courseId');

    res.json({
      success: true,
      message: 'Academic record updated successfully.',
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

export const getAcademicRules = async (req, res, next) => {
  try {
    const rules = await AcademicRule.find().populate('coreRequirements');
    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAcademicRule = async (req, res, next) => {
  try {
    const {
      minimumCredits,
      maximumCredits,
      degreeCreditRequirement,
      applicableSemester,
      coreRequirements,
    } = req.body;

    const rule = await AcademicRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Academic rule not found.' });
    }

    if (minimumCredits !== undefined) rule.minimumCredits = Number(minimumCredits);
    if (maximumCredits !== undefined) rule.maximumCredits = Number(maximumCredits);
    if (degreeCreditRequirement !== undefined)
      rule.degreeCreditRequirement = Number(degreeCreditRequirement);
    if (applicableSemester !== undefined) rule.applicableSemester = Number(applicableSemester);
    if (coreRequirements !== undefined) rule.coreRequirements = coreRequirements;

    await rule.save();

    res.json({
      success: true,
      message: 'Academic rule updated successfully.',
      data: rule,
    });
  } catch (error) {
    next(error);
  }
};
