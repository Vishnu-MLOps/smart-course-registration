import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  BookOpen,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import api from '../../services/api.js';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';

export const ManageCoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    courseCode: '',
    courseName: '',
    description: '',
    department: 'Information Technology',
    credits: 3,
    recommendedSemester: 1,
    courseType: 'core',
    prerequisites: [],
  });

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/courses?active=true');
      setCourses(res.data?.data || []);
    } catch (err) {
      console.error('[ManageCourses] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const openCreateModal = () => {
    setEditingCourse(null);
    setFormData({
      courseCode: '',
      courseName: '',
      description: '',
      department: 'Information Technology',
      credits: 3,
      recommendedSemester: 1,
      courseType: 'core',
      prerequisites: [],
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setFormData({
      courseCode: course.courseCode,
      courseName: course.courseName,
      description: course.description || '',
      department: course.department,
      credits: course.credits,
      recommendedSemester: course.recommendedSemester,
      courseType: course.courseType,
      prerequisites: course.prerequisites?.map((p) => p._id || p) || [],
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handlePrereqToggle = (courseId) => {
    setFormData((prev) => {
      const exists = prev.prerequisites.includes(courseId);
      return {
        ...prev,
        prerequisites: exists
          ? prev.prerequisites.filter((id) => id !== courseId)
          : [...prev.prerequisites, courseId],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      if (editingCourse) {
        await api.put(`/courses/${editingCourse._id}`, formData);
        setFeedback({ type: 'success', message: 'Course updated successfully.' });
      } else {
        await api.post('/courses', formData);
        setFeedback({ type: 'success', message: 'Course created successfully.' });
      }
      setIsModalOpen(false);
      await fetchCourses();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Operation failed.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (courseId, courseCode) => {
    if (!window.confirm(`Are you sure you want to deactivate ${courseCode}? This will archive the course while preserving historical completion records.`)) {
      return;
    }

    try {
      await api.delete(`/courses/${courseId}`);
      setFeedback({ type: 'success', message: `Course ${courseCode} deactivated.` });
      await fetchCourses();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to deactivate course.',
      });
    }
  };

  const filtered = courses.filter(
    (c) =>
      c.courseCode.toLowerCase().includes(search.toLowerCase()) ||
      c.courseName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Curriculum & Course Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Author and configure course catalogs, credit ratings, semester targets, and prerequisite dependencies.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition-colors cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>New Course</span>
        </button>
      </div>

      {feedback && <Alert type={feedback.type} message={feedback.message} />}

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code or title (e.g. IT301, Data Structures)..."
          className="flex-1 bg-transparent text-sm focus:outline-none text-slate-900"
        />
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Course Title</th>
                <th className="py-3 px-4">Credits</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Prerequisites</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center">
                    <Spinner size="md" className="mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No courses found.
                  </td>
                </tr>
              ) : (
                filtered.map((course) => (
                  <tr key={course._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {course.courseCode}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{course.courseName}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{course.credits} Credits</td>
                    <td className="py-3 px-4 text-slate-600">Semester {course.recommendedSemester}</td>
                    <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500">
                      {course.courseType}
                    </td>
                    <td className="py-3 px-4">
                      {course.prerequisites && course.prerequisites.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {course.prerequisites.map((pr) => (
                            <span
                              key={pr._id}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]"
                            >
                              {pr.courseCode}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(course)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Course"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course._id, course.courseCode)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Deactivate Course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCourse ? `Edit Course: ${editingCourse.courseCode}` : 'Create New Curriculum Course'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Course Code</label>
              <input
                type="text"
                required
                value={formData.courseCode}
                onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                placeholder="e.g. IT307"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Course Credits</label>
              <select
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              >
                {[1, 2, 3, 4, 5, 6].map((c) => (
                  <option key={c} value={c}>
                    {c} {c === 1 ? 'Credit' : 'Credits'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Course Title</label>
            <input
              type="text"
              required
              value={formData.courseName}
              onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
              placeholder="e.g. Distributed Database Architecture"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Course overview and syllabus topics..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Recommended Semester</label>
              <select
                value={formData.recommendedSemester}
                onChange={(e) => setFormData({ ...formData, recommendedSemester: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Course Type</label>
              <select
                value={formData.courseType}
                onChange={(e) => setFormData({ ...formData, courseType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              >
                <option value="core">Core Required</option>
                <option value="elective">Elective</option>
                <option value="general">General / Foundation</option>
              </select>
            </div>
          </div>

          {/* Prerequisite Multi-Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Prerequisites (Optional)
            </label>
            <div className="max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              {courses
                .filter((c) => !editingCourse || c._id !== editingCourse._id)
                .map((c) => {
                  const isChecked = formData.prerequisites.includes(c._id);
                  return (
                    <label
                      key={c._id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handlePrereqToggle(c._id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-mono font-bold text-slate-700">{c.courseCode}</span>
                      <span className="text-slate-600 truncate">{c.courseName}</span>
                    </label>
                  );
                })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow cursor-pointer flex items-center gap-2"
            >
              {saving ? <Spinner size="sm" className="border-t-white" /> : null}
              <span>{editingCourse ? 'Save Changes' : 'Create Course'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
