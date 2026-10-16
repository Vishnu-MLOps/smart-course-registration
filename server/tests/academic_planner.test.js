import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from '../seed/seed.js';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Section } from '../models/Section.js';
import { AcademicRecord } from '../models/AcademicRecord.js';
import { AcademicRule } from '../models/AcademicRule.js';
import { getStudentAcademicProgress } from '../services/academicService.js';
import { checkStudentEligibility } from '../services/registrationService.js';

describe('Academic Planner & Degree Completion Calculation Tests', () => {
  let alexStudent;
  let allCourses;
  let courseMap;

  before(async () => {
    await seedDatabase(false);
    alexStudent = await User.findOne({ email: 'alex@student.edu' });
    allCourses = await Course.find();
    courseMap = new Map(allCourses.map((c) => [c.courseCode, c]));
  });

  after(async () => {
    await disconnectDB();
  });

  test('Alex Rivera Baseline: Earned credits calculated only from valid unique completed courses', async () => {
    const progress = await getStudentAcademicProgress(alexStudent);

    // Alex has CS101 (4), MA101 (3), ENG101 (2), CS102 (3), IT102 (3) = 15 credits
    assert.equal(progress.completedCredits, 15, 'Alex must have exactly 15 completed credits');
    assert.equal(progress.creditProgressPercentage, 13, '15/120 credits must equal 13%');
    assert.equal(progress.completedCourses.length, 5, 'Must have 5 unique completed course records');

    // Verify all completed courses have populated course details
    for (const item of progress.completedCourses) {
      assert.ok(item.course, 'Completed course reference must not be null');
      assert.ok(item.course.courseCode, 'Course code must be populated');
      assert.ok(item.course.courseName, 'Course name must be populated');
      assert.ok(item.creditsEarned > 0, 'Credits earned must be positive');
    }
  });

  test('Mandatory Core Curriculum: Exactly 11 core courses remaining totaling 40 credits for Alex', async () => {
    const progress = await getStudentAcademicProgress(alexStudent);

    assert.equal(progress.totalCoreCoursesCount, 15, 'IT curriculum must have 15 mandatory core courses');
    assert.equal(progress.completedCoreCoursesCount, 4, 'Alex must have completed 4 core courses');
    assert.equal(progress.remainingCoreCoursesCount, 11, 'Alex must have exactly 11 remaining mandatory core courses');
    assert.equal(progress.remainingCoreCredits, 40, 'Remaining core courses must total exactly 40 credits');
    assert.equal(progress.isCoreRequirementMet, false, 'Core requirements must NOT be met');
    assert.equal(progress.isGraduationEligible, false, 'Student with 11 remaining core courses cannot be graduation eligible');
    assert.equal(progress.graduationStatus, 'Requirements Pending');
  });

  test('Duplicate Records: Duplicate completion records for same course are deduplicated by academic service', async () => {
    const origFind = AcademicRecord.find;
    try {
      const cs101 = courseMap.get('CS101');
      AcademicRecord.find = () => ({
        populate: async () => [
          {
            _id: new mongoose.Types.ObjectId(),
            studentId: alexStudent._id,
            courseId: cs101,
            status: 'completed',
            grade: 'B',
            creditsEarned: 4,
            completedTerm: 'Fall 2024',
          },
          {
            _id: new mongoose.Types.ObjectId(),
            studentId: alexStudent._id,
            courseId: cs101,
            status: 'completed',
            grade: 'A',
            creditsEarned: 4,
            completedTerm: 'Spring 2025',
          },
        ],
      });

      const progress = await getStudentAcademicProgress(alexStudent);
      assert.equal(progress.completedCredits, 4, 'Duplicate course records must not double-count credits');
      assert.equal(progress.completedCourses.length, 1, 'Completed courses list must contain only 1 unique entry for CS101');
      assert.equal(progress.completedCourses[0].course.courseCode, 'CS101');
    } finally {
      AcademicRecord.find = origFind;
    }
  });

  test('Orphaned / Unlinked Records: Records pointing to non-existent courses are excluded', async () => {
    const demoStudent = await User.create({
      name: 'Demo Orphan Tester',
      email: `orphan_${Date.now()}@test.edu`,
      passwordHash: 'dummy',
      role: 'student',
      department: 'Information Technology',
      semester: 4,
      registrationNumber: `ORP-${Date.now()}`,
    });

    const cs101 = courseMap.get('CS101'); // 4 credits
    const nonExistentCourseId = new mongoose.Types.ObjectId();

    // Insert 1 valid course and 3 orphaned records pointing to non-existent courses
    await AcademicRecord.collection.insertOne({
      studentId: demoStudent._id,
      courseId: cs101._id,
      status: 'completed',
      grade: 'A',
      creditsEarned: cs101.credits,
      completedTerm: 'Fall 2024',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await AcademicRecord.collection.insertOne({
      studentId: demoStudent._id,
      courseId: nonExistentCourseId,
      status: 'completed',
      grade: 'A',
      creditsEarned: 40,
      completedTerm: 'Fall 2023',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const progress = await getStudentAcademicProgress(demoStudent);

    // Only the valid CS101 course (4 credits) should be counted; the 40 phantom credits must be ignored
    assert.equal(progress.completedCredits, 4, 'Orphaned records must not contribute to completed credits');
    assert.equal(progress.completedCourses.length, 1, 'Only valid courses should appear in transcript');
    assert.equal(progress.completedCourses[0].course.courseCode, 'CS101');

    // Clean up
    await AcademicRecord.deleteMany({ studentId: demoStudent._id });
    await User.deleteOne({ _id: demoStudent._id });
  });

  test('Graduation Requirement: 120 credits with incomplete mandatory core courses is NOT graduation eligible', async () => {
    // Create a demo student with 120 credits, but missing mandatory core courses
    const seniorStudent = await User.create({
      name: 'Demo Incomplete Core Senior',
      email: `senior_${Date.now()}@test.edu`,
      passwordHash: 'dummy',
      role: 'student',
      department: 'Information Technology',
      semester: 8,
      registrationNumber: `SNR-${Date.now()}`,
    });

    // Award 120 credits across various courses, but intentionally omit IT401 and IT304
    const coreCourses = allCourses.filter((c) => c.courseType === 'core');
    const coursesToCredit = allCourses.slice(0, 10); // give 10 courses

    for (const c of coursesToCredit) {
      await AcademicRecord.create({
        studentId: seniorStudent._id,
        courseId: c._id,
        status: 'completed',
        grade: 'A',
        creditsEarned: 12, // artificially high to hit 120+ credits
        completedTerm: 'Spring 2026',
      });
    }

    const progress = await getStudentAcademicProgress(seniorStudent);

    assert.ok(progress.completedCredits >= 120, 'Student has 120+ credits');
    assert.equal(progress.isCreditRequirementMet, true, 'Credit requirement flag should be true');
    assert.equal(progress.isCoreRequirementMet, false, 'Core requirement must be false because mandatory core courses are missing');
    assert.equal(progress.isGraduationEligible, false, 'Must NOT be graduation eligible when core courses remain');
    assert.ok(progress.completionPercentage < 100, 'Completion percentage must NOT reach 100% when core courses are incomplete');
    assert.equal(progress.graduationStatus, 'Core Courses Pending');

    // Clean up
    await AcademicRecord.deleteMany({ studentId: seniorStudent._id });
    await User.deleteOne({ _id: seniorStudent._id });
  });

  test('Graduation Eligibility: Both 120 credits and all 15 core courses satisfied declares graduation eligible', async () => {
    const graduateStudent = await User.create({
      name: 'Demo Graduate Student',
      email: `grad_${Date.now()}@test.edu`,
      passwordHash: 'dummy',
      role: 'student',
      department: 'Information Technology',
      semester: 8,
      registrationNumber: `GRD-${Date.now()}`,
    });

    // Award all 21 courses to hit 120 credits and complete all 15 core courses
    for (const c of allCourses) {
      await AcademicRecord.create({
        studentId: graduateStudent._id,
        courseId: c._id,
        status: 'completed',
        grade: 'A',
        creditsEarned: c.credits * 2, // doubles credits to exceed 120
        completedTerm: 'Spring 2026',
      });
    }

    const progress = await getStudentAcademicProgress(graduateStudent);

    assert.ok(progress.completedCredits >= 120, 'Credits must be >= 120');
    assert.equal(progress.remainingCoreCoursesCount, 0, 'No remaining core courses');
    assert.equal(progress.isCoreRequirementMet, true, 'All core requirements met');
    assert.equal(progress.isGraduationEligible, true, 'Must be certified graduation eligible');
    assert.equal(progress.completionPercentage, 100, 'Completion percentage must be 100%');
    assert.equal(progress.graduationStatus, 'Eligible for Graduation');

    // Clean up
    await AcademicRecord.deleteMany({ studentId: graduateStudent._id });
    await User.deleteOne({ _id: graduateStudent._id });
  });

  test('Prerequisite validation strictly enforces actual course completion rather than aggregate credit counter', async () => {
    // Alex has 15 credits. Create a student with 120 aggregate credits from other courses, but NOT IT204 & IT205
    const studentWithHighCredits = await User.create({
      name: 'High Credits No Prereq Student',
      email: `highcred_${Date.now()}@test.edu`,
      passwordHash: 'dummy',
      role: 'student',
      department: 'Information Technology',
      semester: 6,
      registrationNumber: `HIC-${Date.now()}`,
    });

    // Give 120 credits from CS101, MA101, IT102, IT201, IT202 (none are IT204 or IT205)
    const baseCourses = ['CS101', 'MA101', 'IT102', 'IT201', 'IT202'];
    for (const code of baseCourses) {
      const c = courseMap.get(code);
      await AcademicRecord.create({
        studentId: studentWithHighCredits._id,
        courseId: c._id,
        status: 'completed',
        grade: 'A',
        creditsEarned: 24, // 5 * 24 = 120 credits!
        completedTerm: 'Spring 2026',
      });
    }

    // Now attempt to register for IT401 (Distributed Systems: requires IT204 and IT205)
    const it401 = courseMap.get('IT401');
    const it401SecA = await Section.findOne({ courseId: it401._id, sectionCode: 'SEC-A' });

    const eligibility = await checkStudentEligibility(studentWithHighCredits, it401SecA._id);

    // Prerequisite check MUST reject despite student having 120 aggregate credits
    assert.equal(eligibility.eligible, false, 'Must reject enrollment when specific prerequisites are missing');
    assert.equal(eligibility.code, 'PREREQUISITES_INCOMPLETE');
    assert.match(eligibility.reason, /IT204/);
    assert.match(eligibility.reason, /IT205/);

    // Clean up
    await AcademicRecord.deleteMany({ studentId: studentWithHighCredits._id });
    await User.deleteOne({ _id: studentWithHighCredits._id });
  });
});
