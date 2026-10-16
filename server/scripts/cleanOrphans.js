import { connectDB, disconnectDB } from '../config/db.js';
import { AcademicRecord } from '../models/AcademicRecord.js';
import { Course } from '../models/Course.js';
import { User } from '../models/User.js';

export const cleanOrphanedRecords = async () => {
  console.log('[Cleanup] Auditing AcademicRecord collection for orphaned or duplicate records...');
  const courses = await Course.find();
  const validCourseIdSet = new Set(courses.map((c) => c._id.toString()));

  const allRecords = await AcademicRecord.find();
  console.log(`[Cleanup] Found ${allRecords.length} total AcademicRecord documents.`);

  const orphanedIds = [];
  for (const rec of allRecords) {
    if (!rec.courseId || !validCourseIdSet.has(rec.courseId.toString())) {
      orphanedIds.push(rec._id);
    }
  }

  if (orphanedIds.length > 0) {
    const deleteResult = await AcademicRecord.deleteMany({ _id: { $in: orphanedIds } });
    console.log(`[Cleanup] Successfully removed ${deleteResult.deletedCount} orphaned academic records.`);
  } else {
    console.log('[Cleanup] No orphaned academic records detected.');
  }

  // Deduplicate any remaining records by student and courseCode
  const students = await User.find({ role: 'student' });
  let totalDeduplicated = 0;

  for (const s of students) {
    const studentRecords = await AcademicRecord.find({ studentId: s._id }).populate('courseId');
    const seenCourseCodes = new Map();
    const duplicateIds = [];

    for (const r of studentRecords) {
      if (!r.courseId) continue;
      const code = r.courseId.courseCode;
      if (seenCourseCodes.has(code)) {
        // Keep the one with higher credits or valid status
        const prev = seenCourseCodes.get(code);
        if ((r.creditsEarned || 0) > (prev.creditsEarned || 0)) {
          duplicateIds.push(prev._id);
          seenCourseCodes.set(code, r);
        } else {
          duplicateIds.push(r._id);
        }
      } else {
        seenCourseCodes.set(code, r);
      }
    }

    if (duplicateIds.length > 0) {
      const res = await AcademicRecord.deleteMany({ _id: { $in: duplicateIds } });
      totalDeduplicated += res.deletedCount;
      console.log(`[Cleanup] Deduplicated ${res.deletedCount} duplicate records for student ${s.name} (${s.registrationNumber}).`);
    }
  }

  console.log(`[Cleanup] Completed cleanup. Total duplicates purged: ${totalDeduplicated}.`);
};

// Execute if run directly
import { fileURLToPath } from 'url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  (async () => {
    await connectDB();
    await cleanOrphanedRecords();
    await disconnectDB();
  })();
}
