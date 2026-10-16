import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  BookOpen,
  Award,
  Plus,
  Eye,
  FileCheck,
  CheckCircle,
} from 'lucide-react';
import api from '../../services/api.js';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';

export const AdminStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Academic record modal states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentRecords, setStudentRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);

  // New academic record form
  const [recordForm, setRecordForm] = useState({
    courseId: '',
    grade: 'A',
    status: 'completed',
    completedTerm: 'Spring 2026',
    creditsEarned: 3,
  });
  const [savingRecord, setSavingRecord] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const [studRes, courseRes] = await Promise.all([
        api.get('/admin/students'),
        api.get('/courses?active=true'),
      ]);
      setStudents(studRes.data?.data || []);
      setCourses(courseRes.data?.data || []);
    } catch (err) {
      console.error('[AdminStudents] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const openStudentRecords = async (student) => {
    setSelectedStudent(student);
    setIsRecordModalOpen(true);
    setRecordsLoading(true);
    try {
      const res = await api.get(`/admin/students/${student._id}/academic-records`);
      setStudentRecords(res.data?.data || []);
    } catch (err) {
      console.error('[Records] Error fetching student records:', err);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !recordForm.courseId) return;

    setSavingRecord(true);
    try {
      await api.post('/admin/academic-records', {
        studentId: selectedStudent._id,
        ...recordForm,
      });

      // Refresh records
      const res = await api.get(`/admin/students/${selectedStudent._id}/academic-records`);
      setStudentRecords(res.data?.data || []);
      setIsAddRecordOpen(false);
      setFeedback({ type: 'success', message: 'Academic record added successfully.' });
      await fetchStudents();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update academic record.',
      });
    } finally {
      setSavingRecord(false);
    }
  };

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.registrationNumber && s.registrationNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Student Academic Profiles</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review undergraduate records, credit progress, transcripts, and record course completions.
          </p>
        </div>
      </div>

      {feedback && <Alert type={feedback.type} message={feedback.message} />}

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student name, email, or registration number..."
          className="flex-1 bg-transparent text-sm focus:outline-none text-slate-900"
        />
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Registration #</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Standing</th>
                <th className="py-3 px-4">Registered Credits</th>
                <th className="py-3 px-4">Completed Credits</th>
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
                    No students found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{s.name}</p>
                      <p className="text-[11px] text-slate-500">{s.email}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {s.registrationNumber || 'Pending'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{s.department}</td>
                    <td className="py-3 px-4">
                      <Badge variant="slate">Semester {s.semester}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-blue-700">{s.registeredCredits} cr</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-emerald-700">{s.completedCredits} cr</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openStudentRecords(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Transcript</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Transcript & Academic Records Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title={`Academic Record: ${selectedStudent?.name} (${selectedStudent?.registrationNumber})`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Department: {selectedStudent?.department} • Semester {selectedStudent?.semester}
            </span>
            <button
              onClick={() => {
                setRecordForm({
                  courseId: courses[0]?._id || '',
                  grade: 'A',
                  status: 'completed',
                  completedTerm: 'Spring 2026',
                  creditsEarned: courses[0]?.credits || 3,
                });
                setIsAddRecordOpen(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Completion</span>
            </button>
          </div>

          {/* Add Record Subform */}
          {isAddRecordOpen && (
            <form onSubmit={handleCreateRecord} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Add Completed Course Record</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1">Course</label>
                  <select
                    value={recordForm.courseId}
                    onChange={(e) => {
                      const c = courses.find((item) => item._id === e.target.value);
                      setRecordForm({
                        ...recordForm,
                        courseId: e.target.value,
                        creditsEarned: c?.credits || 3,
                      });
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                  >
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.courseCode} — {c.courseName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Grade</label>
                  <select
                    value={recordForm.grade}
                    onChange={(e) => setRecordForm({ ...recordForm, grade: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                  >
                    {['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'].map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1">Completed Term</label>
                  <input
                    type="text"
                    value={recordForm.completedTerm}
                    onChange={(e) => setRecordForm({ ...recordForm, completedTerm: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Credits Earned</label>
                  <input
                    type="number"
                    value={recordForm.creditsEarned}
                    onChange={(e) => setRecordForm({ ...recordForm, creditsEarned: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddRecordOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRecord}
                  className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
                >
                  {savingRecord ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          )}

          {/* Record List */}
          {recordsLoading ? (
            <div className="py-8 text-center">
              <Spinner size="md" className="mx-auto" />
            </div>
          ) : studentRecords.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400 italic">No academic completion records found for this student.</p>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Course Code</th>
                    <th className="py-2.5 px-3">Course Title</th>
                    <th className="py-2.5 px-3">Term</th>
                    <th className="py-2.5 px-3">Credits</th>
                    <th className="py-2.5 px-3">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentRecords.map((rec) => (
                    <tr key={rec._id}>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                        {rec.courseId?.courseCode}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">{rec.courseId?.courseName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{rec.completedTerm}</td>
                      <td className="py-2.5 px-3 font-semibold">{rec.creditsEarned} cr</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {rec.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => setIsRecordModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
