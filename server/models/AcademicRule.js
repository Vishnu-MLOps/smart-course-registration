import mongoose from 'mongoose';

const academicRuleSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      default: 'Information Technology',
      trim: true,
    },
    academicTerm: {
      type: String,
      required: true,
      trim: true,
    },
    minimumCredits: {
      type: Number,
      required: true,
      default: 12,
    },
    maximumCredits: {
      type: Number,
      required: true,
      default: 21,
    },
    degreeCreditRequirement: {
      type: Number,
      required: true,
      default: 120,
    },
    applicableSemester: {
      type: Number,
      min: 1,
      max: 8,
    },
    // Required core courses list for degree audit
    coreRequirements: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
  },
  {
    timestamps: true,
  }
);

academicRuleSchema.index({ department: 1, academicTerm: 1, applicableSemester: 1 });

export const AcademicRule = mongoose.model('AcademicRule', academicRuleSchema);
