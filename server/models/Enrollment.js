import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    academicTerm: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['registered', 'withdrawn', 'dropped'],
      default: 'registered',
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    withdrawalDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate active registration for the same course in the same term
enrollmentSchema.index(
  { studentId: 1, courseId: 1, academicTerm: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'registered' },
  }
);

// Optimize queries for section occupancy and student schedule
enrollmentSchema.index({ sectionId: 1, status: 1 });
enrollmentSchema.index({ studentId: 1, academicTerm: 1, status: 1 });

export const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
