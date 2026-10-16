import mongoose from 'mongoose';

const academicRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    status: {
      type: String,
      enum: ['completed', 'failed', 'in_progress'],
      default: 'completed',
    },
    grade: {
      type: String,
      enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'],
      default: 'A',
    },
    creditsEarned: {
      type: Number,
      required: true,
      default: 0,
    },
    completedTerm: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// One completion record per student per course
academicRecordSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

export const AcademicRecord = mongoose.model('AcademicRecord', academicRecordSchema);
