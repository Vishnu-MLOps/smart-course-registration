import { Course } from '../models/Course.js';
import { Section } from '../models/Section.js';
import { Enrollment } from '../models/Enrollment.js';
import { AcademicRecord } from '../models/AcademicRecord.js';
import { AcademicRule } from '../models/AcademicRule.js';
import { hasTimeOverlap } from './registrationService.js';

export const getStudentAcademicProgress = async (student) => {
  const department = student.department || 'Information Technology';
  const term = 'Fall 2026';

  // 1. Fetch academic rules
  const rule = await AcademicRule.findOne({ department }).populate('coreRequirements');
  const degreeCreditRequirement = rule?.degreeCreditRequirement || 120;
  const maxCredits = rule?.maximumCredits || 21;
  const minCredits = rule?.minimumCredits || 12;

  // 2. Fetch completed records and filter only valid, passing courses with non-null references
  const rawCompletedRecords = await AcademicRecord.find({
    studentId: student._id,
    status: 'completed',
    grade: { $ne: 'F' },
  }).populate('courseId');

  // Filter out records where courseId is null (orphaned/unlinked)
  const validCompletedRecords = rawCompletedRecords.filter(
    (r) => r.courseId && r.courseId._id
  );

  // Deduplicate by courseCode (or courseId) to ensure each course is counted only once
  // In case of duplicate records, keep the record with higher earned credits or latest term
  const uniqueCourseMap = new Map();
  for (const record of validCompletedRecords) {
    const courseCode = record.courseId.courseCode;
    if (!uniqueCourseMap.has(courseCode)) {
      uniqueCourseMap.set(courseCode, record);
    } else {
      const existing = uniqueCourseMap.get(courseCode);
      if ((record.creditsEarned || 0) > (existing.creditsEarned || 0)) {
        uniqueCourseMap.set(courseCode, record);
      }
    }
  }

  const completedRecords = Array.from(uniqueCourseMap.values());

  // Completed credits calculated exclusively from unique, valid completed courses
  const completedCredits = completedRecords.reduce(
    (sum, record) => sum + (record.creditsEarned || record.courseId?.credits || 0),
    0
  );

  const completedCourseIds = new Set(
    completedRecords.map((r) => r.courseId._id.toString())
  );
  const completedCourseCodes = new Set(
    completedRecords.map((r) => r.courseId.courseCode)
  );

  // 3. Fetch currently registered courses
  const activeEnrollments = await Enrollment.find({
    studentId: student._id,
    academicTerm: term,
    status: 'registered',
  })
    .populate('courseId')
    .populate('sectionId');

  const registeredCredits = activeEnrollments.reduce(
    (sum, enr) => sum + (enr.courseId?.credits || 0),
    0
  );

  // 4. Mandatory Core Curriculum Analysis
  const allCoreCourses = await Course.find({
    department,
    courseType: 'core',
    active: true,
  }).sort({ recommendedSemester: 1, courseCode: 1 });

  const totalCoreCoursesCount = allCoreCourses.length;
  const totalCoreCredits = allCoreCourses.reduce((sum, c) => sum + (c.credits || 0), 0);

  const completedCoreCourses = allCoreCourses.filter(
    (course) => completedCourseIds.has(course._id.toString()) || completedCourseCodes.has(course.courseCode)
  );
  const completedCoreCredits = completedCoreCourses.reduce((sum, c) => sum + (c.credits || 0), 0);

  const remainingRequiredCourses = allCoreCourses.filter(
    (course) => !completedCourseIds.has(course._id.toString()) && !completedCourseCodes.has(course.courseCode)
  );
  const remainingCoreCredits = remainingRequiredCourses.reduce((sum, c) => sum + (c.credits || 0), 0);

  // 5. Separate Progress Indicators
  // A. Credit progress (e.g. 15 / 120 = 13%)
  const creditProgressPercentage = Math.min(
    100,
    Math.round((completedCredits / degreeCreditRequirement) * 100)
  );

  // B. Core curriculum progress (e.g. 4 / 15 courses = 27%)
  const coreProgressPercentage = totalCoreCoursesCount > 0
    ? Math.round((completedCoreCourses.length / totalCoreCoursesCount) * 100)
    : 100;

  // C. Overall Degree Completion Status & Graduation Eligibility
  const isCreditRequirementMet = completedCredits >= degreeCreditRequirement;
  const isCoreRequirementMet = remainingRequiredCourses.length === 0;
  const isGraduationEligible = isCreditRequirementMet && isCoreRequirementMet;

  // Overall completion percentage: cannot reach 100% if mandatory core requirements remain!
  let completionPercentage = creditProgressPercentage;
  if (!isGraduationEligible && completionPercentage >= 100) {
    completionPercentage = 99; // Cap below 100 until all mandatory requirements are fulfilled
  }

  let graduationStatus = 'In Progress';
  let graduationStatusReason = '';
  if (isGraduationEligible) {
    graduationStatus = 'Eligible for Graduation';
    graduationStatusReason = 'All degree credit requirements and mandatory core courses have been successfully satisfied.';
  } else if (!isCreditRequirementMet && !isCoreRequirementMet) {
    graduationStatus = 'Requirements Pending';
    graduationStatusReason = `${degreeCreditRequirement - completedCredits} total credits and ${remainingRequiredCourses.length} mandatory core courses remaining.`;
  } else if (!isCreditRequirementMet && isCoreRequirementMet) {
    graduationStatus = 'Credits Pending';
    graduationStatusReason = `All mandatory core courses completed. ${degreeCreditRequirement - completedCredits} general/elective credits remaining.`;
  } else if (isCreditRequirementMet && !isCoreRequirementMet) {
    graduationStatus = 'Core Courses Pending';
    graduationStatusReason = `Credit threshold of ${degreeCreditRequirement} reached, but ${remainingRequiredCourses.length} mandatory core courses (${remainingCoreCredits} credits) remain uncompleted.`;
  }

  return {
    student: {
      id: student._id,
      name: student.name,
      email: student.email,
      registrationNumber: student.registrationNumber,
      department: student.department,
      semester: student.semester,
    },
    academicTerm: term,
    completedCredits,
    registeredCredits,
    projectedTotalCredits: completedCredits + registeredCredits,
    degreeCreditRequirement,
    completionPercentage,
    creditProgressPercentage,
    coreProgressPercentage,
    isGraduationEligible,
    isCreditRequirementMet,
    isCoreRequirementMet,
    graduationStatus,
    graduationStatusReason,
    totalCoreCoursesCount,
    totalCoreCredits,
    completedCoreCoursesCount: completedCoreCourses.length,
    completedCoreCredits,
    remainingCoreCoursesCount: remainingRequiredCourses.length,
    remainingCoreCredits,
    minimumCreditsAllowed: minCredits,
    maximumCreditsAllowed: maxCredits,
    completedCourses: completedRecords.map((r) => ({
      _id: r._id,
      course: r.courseId,
      grade: r.grade,
      creditsEarned: r.creditsEarned,
      completedTerm: r.completedTerm,
    })),
    registeredCourses: activeEnrollments.map((enr) => ({
      enrollmentId: enr._id,
      course: enr.courseId,
      section: enr.sectionId,
      registrationDate: enr.registrationDate,
    })),
    remainingRequiredCourses,
  };
};

export const getCourseRecommendations = async (student) => {
  const term = 'Fall 2026';
  const department = student.department || 'Information Technology';

  // 1. Student's completed courses (valid only, non-null)
  const completedRecords = await AcademicRecord.find({
    studentId: student._id,
    status: 'completed',
    grade: { $ne: 'F' },
  }).populate('courseId');

  const validRecords = completedRecords.filter((r) => r.courseId && r.courseId._id);

  const completedCourseIds = new Set(
    validRecords.map((r) => r.courseId._id.toString())
  );
  const completedCourseCodes = new Set(
    validRecords.map((r) => r.courseId.courseCode)
  );

  // 2. Student's currently registered courses & schedule
  const activeEnrollments = await Enrollment.find({
    studentId: student._id,
    academicTerm: term,
    status: 'registered',
  })
    .populate('courseId')
    .populate('sectionId');

  const registeredCourseIds = new Set(
    activeEnrollments.filter((e) => e.courseId).map((e) => e.courseId._id.toString())
  );
  const registeredCourseCodes = new Set(
    activeEnrollments.filter((e) => e.courseId).map((e) => e.courseId.courseCode)
  );

  const currentCredits = activeEnrollments.reduce(
    (sum, enr) => sum + (enr.courseId?.credits || 0),
    0
  );

  const rule = await AcademicRule.findOne({ department, academicTerm: term });
  const maxCredits = rule?.maximumCredits || 21;
  const remainingCreditAllowance = maxCredits - currentCredits;

  // 3. Fetch all active candidate courses in department
  const candidateCourses = await Course.find({
    department,
    active: true,
  }).populate('prerequisites');

  // Fetch all sections for the term with current occupancy
  const sections = await Section.find({
    academicTerm: term,
    active: true,
  });

  const sectionOccupancy = await Enrollment.aggregate([
    { $match: { academicTerm: term, status: 'registered' } },
    { $group: { _id: '$sectionId', count: { $sum: 1 } } },
  ]);
  const occupancyMap = new Map(sectionOccupancy.map((o) => [o._id.toString(), o.count]));

  // Build a reverse prerequisite map: CourseId -> list of courses that require it
  const unlocksMap = new Map();
  candidateCourses.forEach((c) => {
    if (c.prerequisites && c.prerequisites.length > 0) {
      c.prerequisites.forEach((p) => {
        const pid = p._id ? p._id.toString() : p.toString();
        if (!unlocksMap.has(pid)) unlocksMap.set(pid, []);
        unlocksMap.get(pid).push(c.courseCode);
      });
    }
  });

  const recommendations = [];

  for (const course of candidateCourses) {
    const cid = course._id.toString();
    const cCode = course.courseCode;

    // Skip if student already completed this course or has equivalent course code
    if (completedCourseIds.has(cid) || completedCourseCodes.has(cCode)) continue;

    // Skip if student is already registered for this course this term
    if (registeredCourseIds.has(cid) || registeredCourseCodes.has(cCode)) continue;

    let score = 0;
    const reasons = [];
    let eligible = true;

    // A. Check Prerequisites
    let prereqsSatisfied = true;
    const missingPrereqs = [];
    if (course.prerequisites && course.prerequisites.length > 0) {
      for (const pr of course.prerequisites) {
        const prid = pr._id ? pr._id.toString() : pr.toString();
        const prCode = pr.courseCode;
        if (!completedCourseIds.has(prid) && (!prCode || !completedCourseCodes.has(prCode))) {
          prereqsSatisfied = false;
          missingPrereqs.push(pr.courseCode || 'Required Prerequisite');
        }
      }
    }

    if (!prereqsSatisfied) {
      eligible = false;
      reasons.push(`Prerequisites missing (${missingPrereqs.join(', ')}).`);
    } else {
      score += 25;
      if (course.prerequisites.length > 0) {
        const completedNames = course.prerequisites.map((p) => p.courseName || p.courseCode).join(', ');
        reasons.push(`You completed prerequisite (${completedNames}).`);
      }
    }

    // B. Degree Requirement
    if (course.courseType === 'core') {
      score += 40;
      reasons.push('Satisfies a mandatory degree requirement.');
    } else if (course.courseType === 'elective') {
      score += 15;
      reasons.push('Fulfills department elective credits.');
    }

    // C. Semester Alignment
    if (course.recommendedSemester === student.semester) {
      score += 30;
      reasons.push(`Matches your current Semester ${student.semester} plan.`);
    } else if (course.recommendedSemester < student.semester) {
      score += 35; // Priority to clear backlogged lower-semester core courses
      reasons.push(`Backlog core course from Semester ${course.recommendedSemester}.`);
    }

    // D. Unlocks subsequent courses
    const unlockedList = unlocksMap.get(cid);
    if (unlockedList && unlockedList.length > 0) {
      score += 20;
      reasons.push(`Unlocks future course: ${unlockedList.slice(0, 2).join(', ')}.`);
    }

    // E. Credit Allowance Check
    if (course.credits > remainingCreditAllowance) {
      eligible = false;
      reasons.push(`Exceeds term credit limit (${course.credits} cr exceeds remaining ${remainingCreditAllowance} cr allowance).`);
    }

    // F. Section Availability & Timetable Conflict Check
    const courseSections = sections.filter((s) => s.courseId.toString() === cid);
    let fittingSectionFound = null;

    for (const sec of courseSections) {
      const occupied = occupancyMap.get(sec._id.toString()) || 0;
      const availableSeats = sec.capacity - occupied;
      if (availableSeats <= 0) continue;

      // Check timetable conflict against student's existing active enrollments
      let hasConflict = false;
      for (const newM of sec.schedule) {
        for (const enr of activeEnrollments) {
          const exSec = enr.sectionId;
          if (!exSec || !exSec.schedule) continue;
          for (const exM of exSec.schedule) {
            if (hasTimeOverlap(newM, exM)) {
              hasConflict = true;
              break;
            }
          }
          if (hasConflict) break;
        }
        if (hasConflict) break;
      }

      if (!hasConflict) {
        fittingSectionFound = {
          sectionId: sec._id,
          sectionCode: sec.sectionCode,
          availableSeats,
          room: sec.room,
          faculty: sec.faculty,
        };
        break;
      }
    }

    if (fittingSectionFound) {
      score += 20;
      reasons.push(`Section ${fittingSectionFound.sectionCode} has open seats and fits your weekly timetable perfectly.`);
    } else if (courseSections.length > 0) {
      reasons.push('No conflict-free section with available seats in this term.');
    } else {
      reasons.push('No sections offered this term.');
      eligible = false;
    }

    recommendations.push({
      course,
      score,
      eligible,
      bestSection: fittingSectionFound,
      reasons,
      recommendationSummary: `Recommended because ${reasons.join(' ')}`,
    });
  }

  // Sort descending by score; eligible courses appear first
  recommendations.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return b.score - a.score;
  });

  return recommendations;
};
