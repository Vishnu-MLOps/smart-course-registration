import { Section } from '../models/Section.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';

export const getSections = async (req, res, next) => {
  try {
    const { courseId, academicTerm, semester } = req.query;
    const query = { active: true };

    if (courseId) query.courseId = courseId;
    if (academicTerm) query.academicTerm = academicTerm;
    if (semester) query.semester = Number(semester);

    const sections = await Section.find(query)
      .populate('courseId', 'courseCode courseName department credits prerequisites')
      .sort({ sectionCode: 1 });

    // Aggregate real-time enrollment counts for each section
    const sectionIds = sections.map((s) => s._id);
    const counts = await Enrollment.aggregate([
      {
        $match: {
          sectionId: { $in: sectionIds },
          status: 'registered',
        },
      },
      {
        $group: {
          _id: '$sectionId',
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    const enrichedSections = sections.map((section) => {
      const enrolledCount = countMap.get(section._id.toString()) || 0;
      return {
        ...section.toObject(),
        enrolledCount,
        availableSeats: Math.max(0, section.capacity - enrolledCount),
        isFull: enrolledCount >= section.capacity,
      };
    });

    res.json({
      success: true,
      count: enrichedSections.length,
      data: enrichedSections,
    });
  } catch (error) {
    next(error);
  }
};

export const getSectionById = async (req, res, next) => {
  try {
    const section = await Section.findById(req.params.id).populate('courseId');
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found.',
      });
    }

    const enrolledCount = await Enrollment.countDocuments({
      sectionId: section._id,
      status: 'registered',
    });

    res.json({
      success: true,
      data: {
        ...section.toObject(),
        enrolledCount,
        availableSeats: Math.max(0, section.capacity - enrolledCount),
        isFull: enrolledCount >= section.capacity,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createSection = async (req, res, next) => {
  try {
    const {
      courseId,
      sectionCode,
      faculty,
      capacity,
      schedule,
      room,
      semester,
      academicTerm,
    } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course specified for section does not exist.',
      });
    }

    const existing = await Section.findOne({
      courseId,
      sectionCode: sectionCode?.toUpperCase().trim(),
      academicTerm: academicTerm?.trim() || 'Fall 2026',
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Section ${sectionCode} already exists for this course in ${academicTerm}.`,
      });
    }

    const section = await Section.create({
      courseId,
      sectionCode: sectionCode.toUpperCase().trim(),
      faculty: faculty.trim(),
      capacity: Number(capacity),
      schedule,
      room: room.trim(),
      semester: Number(semester) || course.recommendedSemester,
      academicTerm: academicTerm?.trim() || 'Fall 2026',
    });

    res.status(201).json({
      success: true,
      message: 'Section created successfully.',
      data: section,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSection = async (req, res, next) => {
  try {
    const section = await Section.findById(req.params.id);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found.',
      });
    }

    const currentEnrollmentCount = await Enrollment.countDocuments({
      sectionId: section._id,
      status: 'registered',
    });

    // Check capacity reduction safety rule
    if (req.body.capacity !== undefined) {
      const newCapacity = Number(req.body.capacity);
      if (newCapacity < currentEnrollmentCount) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce section capacity to ${newCapacity}. Current active enrollment is ${currentEnrollmentCount} students.`,
        });
      }
      section.capacity = newCapacity;
    }

    // If schedule is changed and students are already enrolled, warn or prevent creating silent collisions
    if (req.body.schedule && currentEnrollmentCount > 0) {
      // Allow administrator schedule updates but log warning or update schedule safely
      section.schedule = req.body.schedule;
    } else if (req.body.schedule) {
      section.schedule = req.body.schedule;
    }

    if (req.body.faculty) section.faculty = req.body.faculty.trim();
    if (req.body.room) section.room = req.body.room.trim();
    if (req.body.sectionCode) section.sectionCode = req.body.sectionCode.toUpperCase().trim();
    if (req.body.active !== undefined) section.active = req.body.active;

    await section.save();

    res.json({
      success: true,
      message: 'Section updated successfully.',
      data: section,
    });
  } catch (error) {
    next(error);
  }
};
