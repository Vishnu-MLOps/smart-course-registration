import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Layers,
  Clock,
  User,
  MapPin,
  AlertTriangle,
  X,
  Trash2,
} from 'lucide-react';
import api from '../../services/api.js';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';

export const ManageSectionsPage = () => {
  const [sections, setSections] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    courseId: '',
    sectionCode: '',
    faculty: '',
    capacity: 30,
    room: '',
    academicTerm: 'Fall 2026',
    semester: 1,
    schedule: [{ day: 'Monday', startTime: '09:00', endTime: '10:30' }],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [secRes, courseRes] = await Promise.all([
        api.get('/sections'),
        api.get('/courses?active=true'),
      ]);
      setSections(secRes.data?.data || []);
      setCourses(courseRes.data?.data || []);
    } catch (err) {
      console.error('[ManageSections] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingSection(null);
    setFormData({
      courseId: courses[0]?._id || '',
      sectionCode: 'SEC-A',
      faculty: '',
      capacity: 30,
      room: '',
      academicTerm: 'Fall 2026',
      semester: 1,
      schedule: [{ day: 'Monday', startTime: '09:00', endTime: '10:30' }],
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sec) => {
    setEditingSection(sec);
    setFormData({
      courseId: sec.courseId?._id || sec.courseId,
      sectionCode: sec.sectionCode,
      faculty: sec.faculty,
      capacity: sec.capacity,
      room: sec.room,
      academicTerm: sec.academicTerm,
      semester: sec.semester,
      schedule: sec.schedule || [],
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleAddScheduleMeeting = () => {
    setFormData((prev) => ({
      ...prev,
      schedule: [...prev.schedule, { day: 'Wednesday', startTime: '09:00', endTime: '10:30' }],
    }));
  };

  const handleRemoveScheduleMeeting = (idx) => {
    setFormData((prev) => ({
      ...prev,
      schedule: prev.schedule.filter((_, i) => i !== idx),
    }));
  };

  const handleScheduleChange = (idx, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.schedule];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, schedule: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      if (editingSection) {
        await api.put(`/sections/${editingSection._id}`, formData);
        setFeedback({ type: 'success', message: 'Section updated successfully.' });
      } else {
        await api.post('/sections', formData);
        setFeedback({ type: 'success', message: 'Section created successfully.' });
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Operation failed.',
      });
    } finally {
      setSaving(false);
    }
  };

  const filtered = sections.filter((s) => {
    const code = s.courseId?.courseCode || '';
    const title = s.courseId?.courseName || '';
    const faculty = s.faculty || '';
    const q = search.toLowerCase();
    return (
      code.toLowerCase().includes(q) ||
      title.toLowerCase().includes(q) ||
      faculty.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Section & Timetable Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign classroom capacities, faculties, and weekly recurring class schedules.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition-colors cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>New Section</span>
        </button>
      </div>

      {feedback && <Alert type={feedback.type} message={feedback.message} />}

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by course code, title, or faculty..."
          className="flex-1 bg-transparent text-sm focus:outline-none text-slate-900"
        />
      </div>

      {/* Sections Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4">Faculty</th>
                <th className="py-3 px-4">Classroom</th>
                <th className="py-3 px-4">Occupancy / Capacity</th>
                <th className="py-3 px-4">Meeting Times</th>
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
                    No sections found.
                  </td>
                </tr>
              ) : (
                filtered.map((sec) => (
                  <tr key={sec._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-indigo-700 block">
                        {sec.courseId?.courseCode}
                      </span>
                      <span className="text-slate-600 truncate max-w-xs block font-medium">
                        {sec.courseId?.courseName}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{sec.sectionCode}</td>
                    <td className="py-3 px-4 text-slate-700">{sec.faculty}</td>
                    <td className="py-3 px-4 text-slate-600">{sec.room}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">
                          {sec.enrolledCount} / {sec.capacity}
                        </span>
                        <Badge variant={sec.availableSeats === 0 ? 'danger' : 'success'}>
                          {sec.availableSeats} open
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {sec.schedule?.map((m, idx) => (
                          <div key={idx} className="font-mono text-[11px] text-slate-600">
                            {m.day} {m.startTime}-{m.endTime}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditModal(sec)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Section & Capacity"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Section Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSection ? `Edit Section ${editingSection.sectionCode}` : 'Create Course Section'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Course</label>
              <select
                disabled={!!editingSection}
                value={formData.courseId}
                onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 disabled:opacity-60"
              >
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.courseCode} — {c.courseName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Section Code</label>
              <input
                type="text"
                required
                value={formData.sectionCode}
                onChange={(e) => setFormData({ ...formData, sectionCode: e.target.value })}
                placeholder="e.g. SEC-A"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Faculty Instructor</label>
              <input
                type="text"
                required
                value={formData.faculty}
                onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                placeholder="e.g. Dr. Alan Turing"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Classroom</label>
              <input
                type="text"
                required
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                placeholder="e.g. Turing Hall 101"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Seat Capacity
                {editingSection && (
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    (Current enrolled: {editingSection.enrolledCount})
                  </span>
                )}
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Term</label>
              <input
                type="text"
                required
                value={formData.academicTerm}
                onChange={(e) => setFormData({ ...formData, academicTerm: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Schedule Meeting Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">Weekly Meeting Schedule</label>
              <button
                type="button"
                onClick={handleAddScheduleMeeting}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Meeting Slot
              </button>
            </div>

            <div className="space-y-2">
              {formData.schedule.map((meeting, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <select
                    value={meeting.day}
                    onChange={(e) => handleScheduleChange(idx, 'day', e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-800"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <input
                    type="time"
                    required
                    value={meeting.startTime}
                    onChange={(e) => handleScheduleChange(idx, 'startTime', e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-800"
                  />
                  <span>to</span>
                  <input
                    type="time"
                    required
                    value={meeting.endTime}
                    onChange={(e) => handleScheduleChange(idx, 'endTime', e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-800"
                  />

                  {formData.schedule.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveScheduleMeeting(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
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
              <span>{editingSection ? 'Save Section' : 'Create Section'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
