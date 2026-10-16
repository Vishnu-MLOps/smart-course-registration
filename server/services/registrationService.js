import mongoose from 'mongoose';
import { Course } from '../models/Course.js';
import { Section } from '../models/Section.js';
import { Enrollment } from '../models/Enrollment.js';
import { AcademicRecord } from '../models/AcademicRecord.js';
import { AcademicRule } from '../models/AcademicRule.js';
import { Notification } from '../models/Notification.js';

// Helper to convert "HH:mm" to minutes from midnight
export const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Check if two schedule slots collide using the strict formula:
// existingStart < newEnd AND newStart < existingEnd
export const hasTimeOverlap = (slot1, slot2) => {
  if (slot1.day !== slot2.day) return false;
  const s1Start = timeToMinutes(slot1.startTime);
  const s1End = timeToMinutes(slot1.endTime);
  const s2Start = timeToMinutes(slot2.startTime);
  const s2End = timeToMinutes(slot2.endTime);

  return s1Start < s2End && s2Start < s1End;
};

export const checkStudentEligibility = async (student, sectionId) => {
  const section = await Section.findById(sectionId).populate('courseId');
  if (!section || !section.active) {
    return { eligible: false, reason: 'Section not found or inactive', code: 'SECTION_NOT_FOUND' };
  }

  const course = section.courseId;
  if (!course || !course.active) {
    return { eligible: false, reason: 'Course not found or inactive', code: 'COURSE_NOT_FOUND' };
  }

  const term = section.academicTerm;

  // 1. Duplicate registration check (same course in same term)
  const existingCourseEnrollment = await Enrollment.findOne({
    studentId: student._id,
    courseId: course._id,
    academicTerm: term,
    status: 'registered',
  });

  if (existingCourseEnrollment) {
    return {
      eligible: false,
      reason: `You are already registered for ${course.courseCode} in ${term}.`,
      code: 'ALREADY_REGISTERED',
    };
  }

  // 2. Prerequisite check: validates actual completed course records rather than aggregate credit counter
  if (course.prerequisites && course.prerequisites.length > 0) {
    const prereqCourses = await Course.find({ _id: { $in: course.prerequisites } });

    // Fetch all student's completed passing records with populated course references
    const completedRecords = await AcademicRecord.find({
      studentId: student._id,
      status: 'completed',
      grade: { $ne: 'F' },
    }).populate('courseId');

    const validCompleted = completedRecords.filter((r) => r.courseId && r.courseId._id);
    const completedCourseIdSet = new Set(validCompleted.map((r) => r.courseId._id.toString()));
    const completedCourseCodeSet = new Set(validCompleted.map((r) => r.courseId.courseCode));

    const missingPrereqs = prereqCourses.filter(
      (pr) => !completedCourseIdSet.has(pr._id.toString()) && !completedCourseCodeSet.has(pr.courseCode)
    );

    if (missingPrereqs.length > 0) {
      const missingList = missingPrereqs.map((p) => `${p.courseCode} (${p.courseName})`).join(', ');
      return {
        eligible: false,
        reason: `Prerequisites incomplete: Missing successful completion of ${missingList}.`,
        code: 'PREREQUISITES_INCOMPLETE',
        missingPrerequisites: missingPrereqs,
      };
    }
  }

  // 3. Seat capacity check
  const activeEnrollmentsCount = await Enrollment.countDocuments({
    sectionId: section._id,
    status: 'registered',
  });

  if (activeEnrollmentsCount >= section.capacity) {
    return {
      eligible: false,
      reason: `Section ${section.sectionCode} has reached its maximum capacity of ${section.capacity} seats.`,
      code: 'SECTION_FULL',
      seatsAvailable: 0,
    };
  }

  // 4. Current registered courses & credits for student in this term
  const currentEnrollments = await Enrollment.find({
    studentId: student._id,
    academicTerm: term,
    status: 'registered',
  })
    .populate('courseId')
    .populate('sectionId');

  const currentCredits = currentEnrollments.reduce((sum, enr) => sum + (enr.courseId?.credits || 0), 0);

  // Retrieve academic rule for student's department and term
  const rule = await AcademicRule.findOne({
    department: student.department || 'Information Technology',
    academicTerm: term,
  });

  const maxCredits = rule ? rule.maximumCredits : 21;

  if (currentCredits + course.credits > maxCredits) {
    return {
      eligible: false,
      reason: `Credit limit exceeded: Registering for ${course.courseCode} (${course.credits} credits) would bring total to ${currentCredits + course.credits}, exceeding the maximum allowed limit of ${maxCredits} credits.`,
      code: 'CREDIT_LIMIT_EXCEEDED',
      currentCredits,
      attemptedCredits: currentCredits + course.credits,
      maxCredits,
    };
  }

  // 5. Timetable conflict check
  for (const newMeeting of section.schedule) {
    for (const enr of currentEnrollments) {
      const existingSection = enr.sectionId;
      if (!existingSection || !existingSection.schedule) continue;

      for (const existingMeeting of existingSection.schedule) {
        if (hasTimeOverlap(newMeeting, existingMeeting)) {
          return {
            eligible: false,
            reason: `Timetable conflict on ${newMeeting.day} between ${section.sectionCode} (${newMeeting.startTime} - ${newMeeting.endTime}) and registered course ${enr.courseId?.courseCode} Section ${existingSection.sectionCode} (${existingMeeting.startTime} - ${existingMeeting.endTime}).`,
            code: 'TIMETABLE_CONFLICT',
            conflictingCourse: enr.courseId,
            conflictingMeeting: existingMeeting,
            newMeeting,
          };
        }
      }
    }
  }

  return {
    eligible: true,
    reason: 'Eligible for registration',
    code: 'ELIGIBLE',
    seatsAvailable: section.capacity - activeEnrollmentsCount,
    currentCredits,
    projectedCredits: currentCredits + course.credits,
    maxCredits,
  };
};

export const registerCourse = async (student, sectionId) => {
  // Step 1: Authoritative backend validation
  const eligibility = await checkStudentEligibility(student, sectionId);
  if (!eligibility.eligible) {
    const error = new Error(eligibility.reason);
    error.statusCode = 400;
    error.code = eligibility.code;
    throw error;
  }

  const section = await Section.findById(sectionId).populate('courseId');
  const course = section.courseId;

  // Step 2: Concurrency & Safe Enrollment Creation
  const topologyType = mongoose.connection.client?.topology?.description?.type || '';
  const useTransaction = topologyType.includes('ReplicaSet') || topologyType === 'Sharded';
  let session = null;

  if (useTransaction) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (_) {
      session = null;
    }
  }

  try {
    if (useTransaction) {
      // Re-verify capacity within transaction to prevent race conditions
      const currentActiveCount = await Enrollment.countDocuments({
        sectionId: section._id,
        status: 'registered',
      }).session(session);

      if (currentActiveCount >= section.capacity) {
        await session.abortTransaction();
        const err = new Error(`Section ${section.sectionCode} is full. No seats remaining.`);
        err.statusCode = 400;
        err.code = 'SECTION_FULL';
        throw err;
      }

      const [newEnrollment] = await Enrollment.create(
        [
          {
            studentId: student._id,
            sectionId: section._id,
            courseId: course._id,
            academicTerm: section.academicTerm,
            status: 'registered',
            registrationDate: new Date(),
          },
        ],
        { session }
      );

      // Create notification
      await Notification.create(
        [
          {
            userId: student._id,
            title: 'Course Registration Successful',
            message: `You have successfully registered for ${course.courseCode}: ${course.courseName} (Section ${section.sectionCode}).`,
            type: 'success',
          },
        ],
        { session }
      );

      await session.commitTransaction();
      await session.endSession();

      return await Enrollment.findById(newEnrollment._id)
        .populate('courseId')
        .populate('sectionId');
    } else {
      // Robust atomic seat reservation for standalone MongoDB
      // Re-check capacity immediately
      const currentActiveCount = await Enrollment.countDocuments({
        sectionId: section._id,
        status: 'registered',
      });

      if (currentActiveCount >= section.capacity) {
        const err = new Error(`Section ${section.sectionCode} is full. No seats remaining.`);
        err.statusCode = 400;
        err.code = 'SECTION_FULL';
        throw err;
      }

      // Create enrollment (unique index on studentId, courseId, term prevents duplicates)
      const newEnrollment = await Enrollment.create({
        studentId: student._id,
        sectionId: section._id,
        courseId: course._id,
        academicTerm: section.academicTerm,
        status: 'registered',
        registrationDate: new Date(),
      });

      // Post-insert verification to guarantee capacity wasn't breached in race condition
      const verifiedCount = await Enrollment.countDocuments({
        sectionId: section._id,
        status: 'registered',
      });

      if (verifiedCount > section.capacity) {
        // Rollback enrollment
        await Enrollment.findByIdAndDelete(newEnrollment._id);
        const err = new Error(`Registration failed: The final seat in section ${section.sectionCode} was claimed.`);
        err.statusCode = 400;
        err.code = 'SECTION_FULL';
        throw err;
      }

      await Notification.create({
        userId: student._id,
        title: 'Course Registration Successful',
        message: `You have successfully registered for ${course.courseCode}: ${course.courseName} (Section ${section.sectionCode}).`,
        type: 'success',
      });

      return await Enrollment.findById(newEnrollment._id)
        .populate('courseId')
        .populate('sectionId');
    }
  } catch (error) {
    if (useTransaction && session) {
      await session.abortTransaction();
      await session.endSession();
    }

    // Generate failed registration notification
    try {
      await Notification.create({
        userId: student._id,
        title: 'Registration Rejected',
        message: `Could not register for ${course?.courseCode || 'course'}: ${error.message}`,
        type: 'error',
      });
    } catch (_) {
      // notification log error ignored
    }

    throw error;
  }
};

export const withdrawCourse = async (student, enrollmentId) => {
  const enrollment = await Enrollment.findOne({
    _id: enrollmentId,
    studentId: student._id,
  }).populate('courseId').populate('sectionId');

  if (!enrollment) {
    const error = new Error('Enrollment not found or does not belong to you.');
    error.statusCode = 404;
    throw error;
  }

  if (enrollment.status === 'withdrawn') {
    const error = new Error('You have already withdrawn from this course.');
    error.statusCode = 400;
    throw error;
  }

  enrollment.status = 'withdrawn';
  enrollment.withdrawalDate = new Date();
  await enrollment.save();

  // Create notification
  await Notification.create({
    userId: student._id,
    title: 'Course Withdrawn',
    message: `You have successfully withdrawn from ${enrollment.courseId?.courseCode || 'course'} (Section ${enrollment.sectionId?.sectionCode || ''}). Your seat has been released.`,
    type: 'warning',
  });

  return enrollment;
};
