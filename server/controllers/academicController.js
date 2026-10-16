import {
  getStudentAcademicProgress,
  getCourseRecommendations,
} from '../services/academicService.js';
import { Enrollment } from '../models/Enrollment.js';

export const getProgress = async (req, res, next) => {
  try {
    const progress = await getStudentAcademicProgress(req.user);
    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

export const getRecommendations = async (req, res, next) => {
  try {
    const recommendations = await getCourseRecommendations(req.user);
    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
};

export const getTimetable = async (req, res, next) => {
  try {
    const term = req.query.academicTerm || 'Fall 2026';

    const enrollments = await Enrollment.find({
      studentId: req.user._id,
      academicTerm: term,
      status: 'registered',
    })
      .populate('courseId')
      .populate('sectionId');

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timetableByDay = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
    };

    const flatMeetings = [];

    // Palette of distinct, harmonious course colors for timetable visualization
    const colors = [
      { bg: 'bg-indigo-50 border-indigo-200 text-indigo-900', badge: 'bg-indigo-600 text-white' },
      { bg: 'bg-emerald-50 border-emerald-200 text-emerald-900', badge: 'bg-emerald-600 text-white' },
      { bg: 'bg-sky-50 border-sky-200 text-sky-900', badge: 'bg-sky-600 text-white' },
      { bg: 'bg-amber-50 border-amber-200 text-amber-900', badge: 'bg-amber-600 text-white' },
      { bg: 'bg-rose-50 border-rose-200 text-rose-900', badge: 'bg-rose-600 text-white' },
      { bg: 'bg-purple-50 border-purple-200 text-purple-900', badge: 'bg-purple-600 text-white' },
      { bg: 'bg-teal-50 border-teal-200 text-teal-900', badge: 'bg-teal-600 text-white' },
    ];

    enrollments.forEach((enr, courseIndex) => {
      const course = enr.courseId;
      const section = enr.sectionId;
      if (!course || !section || !section.schedule) return;

      const style = colors[courseIndex % colors.length];

      section.schedule.forEach((meeting) => {
        const item = {
          enrollmentId: enr._id,
          courseId: course._id,
          courseCode: course.courseCode,
          courseName: course.courseName,
          credits: course.credits,
          sectionCode: section.sectionCode,
          room: section.room,
          faculty: section.faculty,
          day: meeting.day,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          colorTheme: style,
        };

        if (timetableByDay[meeting.day]) {
          timetableByDay[meeting.day].push(item);
        }
        flatMeetings.push(item);
      });
    });

    // Sort each day's meetings by start time
    days.forEach((d) => {
      timetableByDay[d].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    res.json({
      success: true,
      data: {
        academicTerm: term,
        totalRegisteredCourses: enrollments.length,
        totalWeeklyClasses: flatMeetings.length,
        timetableByDay,
        flatMeetings,
      },
    });
  } catch (error) {
    next(error);
  }
};
