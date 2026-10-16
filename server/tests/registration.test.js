import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from '../seed/seed.js';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Section } from '../models/Section.js';
import { Enrollment } from '../models/Enrollment.js';
import {
  registerCourse,
  withdrawCourse,
  checkStudentEligibility,
  hasTimeOverlap,
} from '../services/registrationService.js';
import {
  getStudentAcademicProgress,
  getCourseRecommendations,
} from '../services/academicService.js';

describe('Smart Course Registration Engine & Academic Planning Tests', () => {
  let alexStudent;

  before(async () => {
    // Re-seed DB fresh and keep connection active
    await seedDatabase(false);
    alexStudent = await User.findOne({ email: 'alex@student.edu' });
    assert.ok(alexStudent, 'Alex student should exist');
  });

  after(async () => {
    await disconnectDB();
  });

  test('Timetable Overlap Formula: verifies strict interval collision and exact-boundary adjacency', () => {
    // Slot 1: Monday 09:00 - 10:30
    const slot1 = { day: 'Monday', startTime: '09:00', endTime: '10:30' };
    // Slot 2: Overlapping Monday 10:00 - 11:30
    const slot2 = { day: 'Monday', startTime: '10:00', endTime: '11:30' };
    assert.equal(hasTimeOverlap(slot1, slot2), true, 'Overlapping slots must be detected as conflict');

    // Slot 3: Exact-boundary adjacent Monday 10:30 - 12:00
    // One ends exactly when another begins (10:30 == 10:30)
    const slot3 = { day: 'Monday', startTime: '10:30', endTime: '12:00' };
    assert.equal(
      hasTimeOverlap(slot1, slot3),
      false,
      'Adjacent boundary slots (end equals start) must be permitted without conflict'
    );

    // Slot 4: Different day
    const slot4 = { day: 'Tuesday', startTime: '09:00', endTime: '10:30' };
    assert.equal(hasTimeOverlap(slot1, slot4), false, 'Slots on different days must not conflict');
  });

  test('Scenario 2: Prerequisite Validation Rejects Registration for unmet prerequisites', async () => {
    // Alex tries to register for IT401 Distributed Systems (prereqs: IT204 and IT205, which Alex has not completed)
    const it401 = await Course.findOne({ courseCode: 'IT401' });
    const sec = await Section.findOne({ courseId: it401._id });

    const eligibility = await checkStudentEligibility(alexStudent, sec._id);
    assert.equal(eligibility.eligible, false);
    assert.equal(eligibility.code, 'PREREQUISITES_INCOMPLETE');
    assert.match(eligibility.reason, /Prerequisites incomplete/);

    await assert.rejects(
      async () => {
        await registerCourse(alexStudent, sec._id);
      },
      (err) => {
        assert.equal(err.code, 'PREREQUISITES_INCOMPLETE');
        return true;
      }
    );
  });

  test('Scenario 3: Capacity Limit Rejection when section is full', async () => {
    // IT301 SEC-FULL has capacity 2 and already has 2 registered students
    const fullSec = await Section.findOne({ sectionCode: 'SEC-FULL' });
    assert.ok(fullSec, 'SEC-FULL must exist');

    const eligibility = await checkStudentEligibility(alexStudent, fullSec._id);
    assert.equal(eligibility.eligible, false);
    assert.equal(eligibility.code, 'SECTION_FULL');
    assert.match(eligibility.reason, /maximum capacity/);

    await assert.rejects(
      async () => {
        await registerCourse(alexStudent, fullSec._id);
      },
      (err) => {
        assert.equal(err.code, 'SECTION_FULL');
        return true;
      }
    );
  });

  test('Scenario 4: Timetable Conflict Rejection', async () => {
    // Alex is already registered for IT201 SEC-A which meets Monday 13:00 - 14:30
    // Try to register for CS102 SEC-A which also meets Monday 13:00 - 14:30
    const cs102 = await Course.findOne({ courseCode: 'CS102' });
    const cs102SecA = await Section.findOne({ courseId: cs102._id, sectionCode: 'SEC-A' });

    const eligibility = await checkStudentEligibility(alexStudent, cs102SecA._id);
    assert.equal(eligibility.eligible, false);
    assert.equal(eligibility.code, 'TIMETABLE_CONFLICT');
    assert.match(eligibility.reason, /Timetable conflict/);

    await assert.rejects(
      async () => {
        await registerCourse(alexStudent, cs102SecA._id);
      },
      (err) => {
        assert.equal(err.code, 'TIMETABLE_CONFLICT');
        return true;
      }
    );
  });

  test('Duplicate Registration Detection: cannot register for the same course twice in same term', async () => {
    // Alex is already registered for IT201 SEC-A. Try to register for IT201 SEC-B
    const it201 = await Course.findOne({ courseCode: 'IT201' });
    const it201SecB = await Section.findOne({ courseId: it201._id, sectionCode: 'SEC-B' });

    const eligibility = await checkStudentEligibility(alexStudent, it201SecB._id);
    assert.equal(eligibility.eligible, false);
    assert.equal(eligibility.code, 'ALREADY_REGISTERED');
  });

  test('Scenario 1: Successful Registration when all validation rules pass', async () => {
    // Alex registers for IT204 SEC-A (Computer Networks).
    // Prereq CS102 completed, seats open, schedule on Friday 11:00 / Wed 15:00 does not conflict!
    const it204 = await Course.findOne({ courseCode: 'IT204' });
    const it204SecA = await Section.findOne({ courseId: it204._id, sectionCode: 'SEC-A' });

    const eligibility = await checkStudentEligibility(alexStudent, it204SecA._id);
    assert.equal(eligibility.eligible, true);
    assert.equal(eligibility.code, 'ELIGIBLE');

    const enrollment = await registerCourse(alexStudent, it204SecA._id);
    assert.ok(enrollment, 'Enrollment should be created');
    assert.equal(enrollment.status, 'registered');

    // Verify seat occupancy increased
    const activeCount = await Enrollment.countDocuments({
      sectionId: it204SecA._id,
      status: 'registered',
    });
    assert.equal(activeCount, 1);
  });

  test('Scenario 6: Course Withdrawal and Seat Release', async () => {
    // Alex withdraws from the course just registered (IT204 SEC-A)
    const it204 = await Course.findOne({ courseCode: 'IT204' });
    const enrollment = await Enrollment.findOne({
      studentId: alexStudent._id,
      courseId: it204._id,
      status: 'registered',
    });
    assert.ok(enrollment, 'Active enrollment must exist');

    const withdrawn = await withdrawCourse(alexStudent, enrollment._id);
    assert.equal(withdrawn.status, 'withdrawn');
    assert.ok(withdrawn.withdrawalDate);

    // Verify seat count decreased
    const activeCount = await Enrollment.countDocuments({
      sectionId: enrollment.sectionId,
      status: 'registered',
    });
    assert.equal(activeCount, 0, 'Seat must be released after withdrawal');
  });

  test('Scenario 7: Academic Progress and Rule-Based Recommendations', async () => {
    const progress = await getStudentAcademicProgress(alexStudent);
    assert.equal(progress.student.name, 'Alex Rivera');
    assert.ok(progress.completedCredits > 0, 'Must have completed credits');
    assert.ok(progress.registeredCredits >= 12, 'Must have registered credits');
    assert.ok(progress.completionPercentage > 0, 'Must compute degree completion percentage');

    const recommendations = await getCourseRecommendations(alexStudent);
    assert.ok(recommendations.length > 0, 'Should return recommendations');
    // Top recommendations should have human-readable reasons
    assert.ok(recommendations[0].recommendationSummary.length > 0);
    assert.ok(recommendations[0].score >= 0);
  });
});
