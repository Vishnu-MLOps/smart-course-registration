import { connectDB, disconnectDB } from './config/db.js';
import { User } from './models/User.js';
import { AcademicRecord } from './models/AcademicRecord.js';
import { Course } from './models/Course.js';
import { AcademicRule } from './models/AcademicRule.js';

(async () => {
  await connectDB();
  const students = await User.find({ role: 'student' });
  console.log('Students count:', students.length);
  for (const s of students) {
    const records = await AcademicRecord.find({ studentId: s._id }).populate('courseId');
    const missingCourse = records.filter((r) => !r.courseId);
    console.log(`Student: ${s.name} (${s.registrationNumber}, ${s.email}): Total Records=${records.length}, Records with null courseId=${missingCourse.length}`);
    if (s.registrationNumber === '310624205305' || s.email === 'alex@student.edu') {
      records.forEach((r, idx) => {
        const c = r.courseId;
        console.log(`  [${idx}] recordId=${r._id} storedCourseId=${r.get('courseId')} code=${c ? c.courseCode : 'MISSING'} name=${c ? c.courseName : 'MISSING'} creditsEarned=${r.creditsEarned} status=${r.status} grade=${r.grade}`);
      });
    }
  }

  // Also check AcademicRule
  const rules = await AcademicRule.find();
  console.log('Academic Rules:');
  rules.forEach((rule) => {
    console.log(`  Dept=${rule.department} Term=${rule.academicTerm} degreeReq=${rule.degreeCreditRequirement} coreRequirements=${rule.coreRequirements.length}`);
  });

  await disconnectDB();
})();
