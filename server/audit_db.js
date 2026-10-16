import { connectDB, disconnectDB } from './config/db.js';
import { User } from './models/User.js';
import { AcademicRecord } from './models/AcademicRecord.js';
import { Course } from './models/Course.js';
import { AcademicRule } from './models/AcademicRule.js';

(async () => {
  await connectDB();

  console.log('--- COURSES IN DB ---');
  const courses = await Course.find();
  console.log(`Total courses in DB: ${courses.length}`);
  const courseIdMap = new Map(courses.map(c => [c._id.toString(), c]));
  const courseCodeMap = new Map(courses.map(c => [c.courseCode, c]));

  console.log('--- STUDENTS & ACADEMIC RECORDS ---');
  const students = await User.find({ role: 'student' });
  for (const s of students) {
    const rawRecords = await AcademicRecord.find({ studentId: s._id });
    if (rawRecords.length === 0) continue;

    console.log(`\nStudent: ${s.name} (${s.registrationNumber}, sem: ${s.semester}) - Total Records: ${rawRecords.length}`);

    // Check for broken courseId refs and duplicates
    const courseCodeCounts = new Map();
    let totalCredits = 0;
    let validRecords = 0;
    let missingCourseCount = 0;

    for (const r of rawRecords) {
      totalCredits += r.creditsEarned || 0;
      const course = courseIdMap.get(r.courseId?.toString());
      if (!course) {
        missingCourseCount++;
        console.log(`  [MISSING REF] record _id=${r._id}, stored courseId=${r.courseId}, status=${r.status}, grade=${r.grade}, creditsEarned=${r.creditsEarned}, term=${r.completedTerm}`);
      } else {
        validRecords++;
        const code = course.courseCode;
        courseCodeCounts.set(code, (courseCodeCounts.get(code) || 0) + 1);
        if ((courseCodeCounts.get(code) || 0) > 1) {
          console.log(`  [DUPLICATE] record _id=${r._id}, code=${code}, name=${course.courseName}, term=${r.completedTerm}`);
        }
      }
    }

    console.log(`  Summary for ${s.name}: Raw Records=${rawRecords.length}, Valid Course Refs=${validRecords}, Missing Course Refs=${missingCourseCount}, Sum Credits=${totalCredits}`);
  }

  await disconnectDB();
})();
