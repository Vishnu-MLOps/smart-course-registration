import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Trash2,
  Calendar,
  Clock,
  User,
  MapPin,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import api from '../../services/api.js';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';

export const MyRegistrationsPage = () => {
  const { refreshNotifications } = useNotifications();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeWithdrawModal, setActiveWithdrawModal] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/enrollments/me');
      setEnrollments(res.data?.data || []);
    } catch (err) {
      console.error('[Registrations] Error loading enrollments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const handleWithdrawConfirm = async () => {
    if (!activeWithdrawModal) return;
    setWithdrawing(true);
    setFeedback(null);

    try {
      await api.delete(`/enrollments/${activeWithdrawModal._id}`);
      setFeedback({
        type: 'success',
        title: 'Course Withdrawn',
        message: `Successfully withdrawn from ${activeWithdrawModal.courseId?.courseCode}. The seat has been released back into available inventory.`,
      });
      refreshNotifications();
      setActiveWithdrawModal(null);
      await fetchEnrollments();
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Withdrawal Failed',
        message: err.response?.data?.message || err.message || 'Unable to process course withdrawal.',
      });
    } finally {
      setWithdrawing(false);
    }
  };

  const totalCredits = enrollments.reduce((sum, enr) => sum + (enr.courseId?.credits || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Active Registrations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Confirmed course enrollments and weekly class commitments for Fall 2026.
          </p>
        </div>
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition-colors cursor-pointer self-start sm:self-center"
        >
          <BookOpen className="w-4 h-4" />
          Add More Courses
        </Link>
      </div>

      {feedback && (
        <Alert
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          className="shadow-sm"
        />
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-semibold uppercase">Total Registered Courses</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{enrollments.length} Courses</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-semibold uppercase">Enrolled Academic Credits</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{totalCredits} Credits</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-semibold uppercase">Remaining Credit Allowance</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{Math.max(0, 21 - totalCredits)} Credits</p>
        </div>
      </div>

      {/* Enrollments Table / Cards */}
      {loading ? (
        <div className="py-20 text-center">
          <Spinner size="lg" className="mx-auto" />
          <p className="text-xs text-slate-500 mt-3">Loading active enrollments...</p>
        </div>
      ) : enrollments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No active course registrations</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You are not currently registered for any courses in the Fall 2026 academic term.
          </p>
          <Link
            to="/catalog"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Explore Course Offerings
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {enrollments.map((enr) => {
            const course = enr.courseId;
            const section = enr.sectionId;

            return (
              <div
                key={enr._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                      {course?.courseCode}
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      Section {section?.sectionCode}
                    </span>
                    <Badge variant="indigo">{course?.credits} Credits</Badge>
                    <Badge variant="success">Confirmed</Badge>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{course?.courseName}</h3>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>{section?.faculty}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{section?.room}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>Registered on {new Date(enr.registrationDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-600">Weekly Schedule:</span>
                    {section?.schedule?.map((m, idx) => (
                      <span key={idx} className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                        {m.day} {m.startTime}-{m.endTime}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex md:flex-col justify-end gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    onClick={() => setActiveWithdrawModal(enr)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Withdraw Course
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Course Withdrawal Confirmation Dialog */}
      <Modal
        isOpen={!!activeWithdrawModal}
        onClose={() => setActiveWithdrawModal(null)}
        title="Confirm Course Withdrawal"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">Are you sure you want to withdraw?</p>
              <p className="mt-1">
                Withdrawing will release your reserved seat in Section {activeWithdrawModal?.sectionId?.sectionCode} immediately. Your enrolled credits will decrease by {activeWithdrawModal?.courseId?.credits} credits.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
            <p>
              <strong className="text-slate-700">Course:</strong> {activeWithdrawModal?.courseId?.courseCode} — {activeWithdrawModal?.courseId?.courseName}
            </p>
            <p>
              <strong className="text-slate-700">Section:</strong> {activeWithdrawModal?.sectionId?.sectionCode} ({activeWithdrawModal?.sectionId?.faculty})
            </p>
            <p>
              <strong className="text-slate-700">Credits Released:</strong> {activeWithdrawModal?.courseId?.credits} Credits
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveWithdrawModal(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleWithdrawConfirm}
              disabled={withdrawing}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow cursor-pointer flex items-center gap-2"
            >
              {withdrawing ? (
                <>
                  <Spinner size="sm" className="border-t-white" />
                  <span>Releasing Seat...</span>
                </>
              ) : (
                <span>Confirm Withdrawal</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
