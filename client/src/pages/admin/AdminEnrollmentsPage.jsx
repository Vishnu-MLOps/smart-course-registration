import React, { useState, useEffect } from 'react';
import { Search, Filter, FileCheck, CheckCircle2, XCircle } from 'lucide-react';
import api from '../../services/api.js';
import { Badge } from '../../components/common/Badge.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';

export const AdminEnrollmentsPage = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const query = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`/admin/enrollments${query}`);
      setEnrollments(res.data?.data || []);
    } catch (err) {
      console.error('[AdminEnrollments] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [statusFilter]);

  const filtered = enrollments.filter((e) => {
    const studentName = e.studentId?.name || '';
    const regNum = e.studentId?.registrationNumber || '';
    const courseCode = e.courseId?.courseCode || '';
    const q = search.toLowerCase();
    return (
      studentName.toLowerCase().includes(q) ||
      regNum.toLowerCase().includes(q) ||
      courseCode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">University Enrollment Records</h1>
        <p className="text-xs text-slate-500 mt-1">
          Authoritative database registrations, seat claims, and withdrawal event logs for Fall 2026.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, ID, or course code..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
        >
          <option value="">All Registration States</option>
          <option value="registered">Active Registered</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Reg #</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Registration Date</th>
                <th className="py-3 px-4">Withdrawal Date</th>
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
                    No enrollment records match filter.
                  </td>
                </tr>
              ) : (
                filtered.map((enr) => (
                  <tr key={enr._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">{enr.studentId?.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{enr.studentId?.registrationNumber}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-indigo-700">
                        {enr.courseId?.courseCode}
                      </span>
                      <span className="block text-[11px] text-slate-500 truncate max-w-xs">
                        {enr.courseId?.courseName}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {enr.sectionId?.sectionCode}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={enr.status === 'registered' ? 'success' : 'warning'}>
                        {enr.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {new Date(enr.registrationDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {enr.withdrawalDate ? new Date(enr.withdrawalDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
