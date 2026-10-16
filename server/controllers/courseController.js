import { Course } from '../models/Course.js';
import { Section } from '../models/Section.js';

export const getCourses = async (req, res, next) => {
  try {
    const { search, department, semester, courseType, active } = req.query;
    const query = {};

    if (active !== undefined) {
      query.active = active === 'true';
    } else {
      query.active = true;
    }

    if (department) {
      query.department = department;
    }

    if (semester) {
      query.recommendedSemester = Number(semester);
    }

    if (courseType) {
      query.courseType = courseType;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ courseCode: searchRegex }, { courseName: searchRegex }];
    }

    const courses = await Course.find(query)
      .populate('prerequisites', 'courseCode courseName credits')
      .sort({ recommendedSemester: 1, courseCode: 1 });

    res.json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};

export const getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      'prerequisites',
      'courseCode courseName credits'
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.',
      });
    }

    // Include associated active sections for this course
    const sections = await Section.find({ courseId: course._id, active: true });

    res.json({
      success: true,
      data: {
        ...course.toObject(),
        sections,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createCourse = async (req, res, next) => {
  try {
    const {
      courseCode,
      courseName,
      description,
      department,
      credits,
      recommendedSemester,
      prerequisites,
      courseType,
    } = req.body;

    const existing = await Course.findOne({ courseCode: courseCode?.toUpperCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Course with code ${courseCode} already exists.`,
      });
    }

    const course = await Course.create({
      courseCode: courseCode.toUpperCase().trim(),
      courseName: courseName.trim(),
      description,
      department: department || 'Information Technology',
      credits: Number(credits),
      recommendedSemester: Number(recommendedSemester) || 1,
      prerequisites: prerequisites || [],
      courseType: courseType || 'core',
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully.',
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.',
      });
    }

    const allowedUpdates = [
      'courseName',
      'description',
      'department',
      'credits',
      'recommendedSemester',
      'prerequisites',
      'courseType',
      'active',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        course[field] = req.body[field];
      }
    });

    if (req.body.courseCode) {
      course.courseCode = req.body.courseCode.toUpperCase().trim();
    }

    await course.save();

    res.json({
      success: true,
      message: 'Course updated successfully.',
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.',
      });
    }

    // Soft delete / deactivate to preserve historical enrollments & records
    course.active = false;
    await course.save();

    res.json({
      success: true,
      message: 'Course deactivated successfully.',
    });
  } catch (error) {
    next(error);
  }
};
