import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  BookOpen,
  Calendar,
  Clock,
  User,
  MapPin,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';

export const CourseCatalogPage = () => {
  const { user } = useAuth();
  const { refreshNotifications } = useNotifications();
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState(null);

  // Registration modal states
  const [activeModalSection, setActiveModalSection] = useState(null);
  const [activeModalCourse, setActiveModalCourse] = useState(null);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerError, setRegisterError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesRes, sectionsRes, enrollRes] = await Promise.all([
        api.get('/courses'),
        api.get('/sections'),
        api.get('/enrollments/me'),
      ]);

      setCourses(coursesRes.data?.data || []);
      setSections(sectionsRes.data?.data || []);
      setMyEnrollments(enrollRes.data?.data || []);
    } catch (err) {
      console.error('[Catalog] Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openRegisterModal = async (course, section) => {
    setActiveModalCourse(course);
    setActiveModalSection(section);
    setEligibilityData(null);
    setRegisterSuccess('');
    setRegisterError('');
    setCheckingEligibility(true);

    try {
      const res = await api.get(`/enrollments/check-eligibility?sectionId=${section._id}`);
      setEligibilityData(res.data?.data);
    } catch (err) {
      setRegisterError(err.response?.data?.message || 'Failed to verify eligibility with backend.');
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleConfirmRegister = async () => {
    if (!activeModalSection) return;
    setRegistering(true);
    setRegisterError('');

    try {
      const res = await api.post('/enrollments', { sectionId: activeModalSection._id });
      setRegisterSuccess(`Successfully registered for ${activeModalCourse.courseCode} Section ${activeModalSection.sectionCode}!`);
      refreshNotifications();
      // Refresh catalog and enrollments to reflect new seat counts
      await fetchData();
    } catch (err) {
      setRegisterError(err.response?.data?.message || err.message || 'Course registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  const registeredCourseIdSet = new Set(
    myEnrollments.map((enr) => enr.courseId?._id?.toString() || enr.courseId?.toString())
  );

  // Filter courses
  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      !search ||
      c.courseCode.toLowerCase().includes(search.toLowerCase()) ||
      c.courseName.toLowerCase().includes(search.toLowerCase());

    const matchesDept = !selectedDept || c.department === selectedDept;
    const matchesSemester = !selectedSemester || c.recommendedSemester === Number(selectedSemester);
    const matchesType = !selectedType || c.courseType === selectedType;

    return matchesSearch && matchesDept && matchesSemester && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Course Catalog & Registration</h1>
        <p className="text-xs text-slate-500 mt-1">
          Explore courses, inspect meeting schedules and real-time seat availability, and register for Fall 2026 sections.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by course code or name (e.g. IT204, Networks, Algorithms)..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Course Types</option>
              <option value="core">Core Required</option>
              <option value="elective">Elective</option>
              <option value="general">General / Foundation</option>
            </select>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Computer Science">Computer Science</option>
            </select>
          </div>
        </div>
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="py-20 text-center">
          <Spinner size="lg" className="mx-auto" />
          <p className="text-xs text-slate-500 mt-3">Loading active course offerings...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No courses match your filter criteria</h3>
          <p className="text-xs text-slate-500 mt-1">Try resetting the search filters or keywords.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCourses.map((course) => {
            const courseSections = sections.filter(
              (s) => (s.courseId?._id || s.courseId) === course._id
            );
            const isRegistered = registeredCourseIdSet.has(course._id.toString());
            const isExpanded = expandedCourseId === course._id;

            return (
              <div
                key={course._id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:border-slate-300 transition-all"
              >
                {/* Course Card Header */}
                <div
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                  onClick={() => setExpandedCourseId(isExpanded ? null : course._id)}
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                        {course.courseCode}
                      </span>
                      <Badge variant="indigo">{course.credits} Credits</Badge>
                      <Badge variant="slate">Semester {course.recommendedSemester}</Badge>
                      <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold ml-1">
                        {course.courseType}
                      </span>
                      {isRegistered && (
                        <Badge variant="success">Already Registered</Badge>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-slate-900">{course.courseName}</h2>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{course.description}</p>

                    {/* Prerequisites Pill */}
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-600">Prerequisites:</span>
                      {course.prerequisites && course.prerequisites.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {course.prerequisites.map((pr) => (
                            <span
                              key={pr._id}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono border border-slate-200"
                            >
                              {pr.courseCode} ({pr.courseName})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None (Open to all students)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      {courseSections.length} {courseSections.length === 1 ? 'Section' : 'Sections'}
                    </span>
                    <button
                      type="button"
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Sections Tray */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Offered Sections for Fall 2026
                    </h4>

                    {courseSections.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No sections currently scheduled for this term.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {courseSections.map((sec) => {
                          const isFull = sec.isFull || sec.availableSeats <= 0;
                          return (
                            <div
                              key={sec._id}
                              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                    Section {sec.sectionCode}
                                  </span>
                                  <Badge variant={isFull ? 'danger' : 'success'}>
                                    {isFull ? 'Full (0 Seats)' : `${sec.availableSeats} of ${sec.capacity} Seats Available`}
                                  </Badge>
                                </div>

                                <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                                  <div className="flex items-center gap-2">
                                    <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                    <span className="font-medium text-slate-800">{sec.faculty}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                    <span>{sec.room}</span>
                                  </div>
                                  <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                                    <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                      {sec.schedule?.map((m, idx) => (
                                        <div key={idx} className="font-mono text-[11px] text-slate-700">
                                          {m.day} • {m.startTime} - {m.endTime}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => openRegisterModal(course, sec)}
                                disabled={isRegistered}
                                className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                                  isRegistered
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : isFull
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 cursor-pointer'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow cursor-pointer'
                                }`}
                              >
                                {isRegistered
                                  ? 'Enrolled'
                                  : isFull
                                  ? 'Check Registration (Full)'
                                  : 'Select & Register'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Registration Modal */}
      <Modal
        isOpen={!!activeModalSection}
        onClose={() => setActiveModalSection(null)}
        title={`Course Registration: ${activeModalCourse?.courseCode}`}
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {activeModalCourse?.courseCode}
              </span>
              <span className="text-xs font-bold text-slate-700">
                Section {activeModalSection?.sectionCode}
              </span>
              <Badge variant="indigo">{activeModalCourse?.credits} Credits</Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900">{activeModalCourse?.courseName}</h3>
            <p className="text-xs text-slate-500 mt-1">Instructor: {activeModalSection?.faculty} | Room: {activeModalSection?.room}</p>
          </div>

          {/* Meeting Schedule */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <p className="font-semibold text-slate-700 mb-1">Weekly Meeting Schedule:</p>
            {activeModalSection?.schedule?.map((m, idx) => (
              <div key={idx} className="font-mono text-slate-600">
                {m.day}: {m.startTime} – {m.endTime}
              </div>
            ))}
          </div>

          {/* Real-time Backend Eligibility Inspection */}
          {checkingEligibility ? (
            <div className="py-6 text-center">
              <Spinner size="md" className="mx-auto" />
              <p className="text-xs text-slate-500 mt-2">Checking prerequisites, seat capacity, credit limits, and timetable clashes...</p>
            </div>
          ) : registerSuccess ? (
            <Alert type="success" title="Registration Confirmed" message={registerSuccess} />
          ) : registerError ? (
            <Alert type="error" title="Registration Failed" message={registerError} />
          ) : eligibilityData ? (
            eligibilityData.eligible ? (
              <Alert
                type="success"
                title="Registration Verified & Eligible"
                message={`All academic rules satisfied. Registering will bring your registered credits from ${eligibilityData.currentCredits} to ${eligibilityData.projectedCredits} (Max: ${eligibilityData.maxCredits}). Available seats: ${eligibilityData.seatsAvailable}.`}
              />
            ) : (
              <Alert
                type="error"
                title={`Registration Blocked: ${eligibilityData.code}`}
                message={eligibilityData.reason}
              />
            )
          ) : null}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveModalSection(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            {!registerSuccess && (
              <button
                type="button"
                onClick={handleConfirmRegister}
                disabled={registering || (eligibilityData && !eligibilityData.eligible)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {registering ? (
                  <>
                    <Spinner size="sm" className="border-t-white" />
                    <span>Processing Registration...</span>
                  </>
                ) : (
                  <span>Confirm Registration</span>
                )}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
