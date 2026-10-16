import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  Layers,
  FileCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../../services/api.js';
import { StatCard } from '../../components/common/StatCard.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/dashboard');
        setStats(res.data?.data);
      } catch (err) {
        console.error('[AdminDashboard] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Spinner size="lg" className="mx-auto" />
        <p className="text-xs text-slate-500 mt-3">Compiling registrar analytics and seat metrics...</p>
      </div>
    );
  }

  const chartData = stats?.departmentBreakdown || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Registrar & Academic Operations Dashboard
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Fall 2026 Academic Term real-time enrollment telemetry and section capacity monitoring.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Enrolled Students"
          value={stats?.totalStudents || 0}
          subtitle="Active undergraduates"
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Active Courses"
          value={stats?.totalCourses || 0}
          subtitle="Department curriculum"
          icon={BookOpen}
          color="blue"
        />
        <StatCard
          title="Scheduled Sections"
          value={stats?.totalSections || 0}
          subtitle="Active meeting sections"
          icon={Layers}
          color="emerald"
        />
        <StatCard
          title="Total Registrations"
          value={stats?.totalRegistrations || 0}
          subtitle="Confirmed course enrollments"
          icon={FileCheck}
          color="amber"
        />
      </div>

      {/* Middle Split: Near Capacity Alert & Enrollment Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sections Nearing Full Capacity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Sections Nearing Capacity (≥80% Full)
              </h2>
              <p className="text-xs text-slate-500">Early warning for seat shortages</p>
            </div>
            <Badge variant="warning">{stats?.nearCapacitySections?.length || 0} Sections</Badge>
          </div>

          {stats?.nearCapacitySections && stats.nearCapacitySections.length > 0 ? (
            <div className="space-y-3">
              {stats.nearCapacitySections.map((sec, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {sec.courseCode} ({sec.sectionCode})
                      </span>
                      <p className="text-xs text-slate-600 font-medium">{sec.courseName}</p>
                    </div>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {sec.enrolled} / {sec.capacity} Seats ({sec.occupancyPercentage}%)
                    </span>
                  </div>

                  {/* Capacity Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        sec.occupancyPercentage >= 100 ? 'bg-rose-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, sec.occupancyPercentage)}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Faculty: {sec.faculty}</span>
                    <span>Room: {sec.room}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500 italic">
              All active sections currently have adequate capacity margin.
            </div>
          )}
        </div>

        {/* Enrollment Distribution Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Enrollment Volume by Department
            </h2>
            <p className="text-xs text-slate-500">Student enrollment distribution across departments</p>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Total Enrolled" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No enrollment data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Registration Activity Log */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 bg-slate-50/70">
          <h2 className="text-sm font-bold text-slate-900">Recent Registration Activity</h2>
          <p className="text-xs text-slate-500">Latest transaction events recorded in database</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats?.recentActivity?.map((act) => (
                <tr key={act._id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-800">{act.studentId?.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{act.studentId?.registrationNumber}</td>
                  <td className="py-3 px-4 font-mono font-bold text-blue-700">
                    {act.courseId?.courseCode}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700">
                    {act.sectionId?.sectionCode}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={act.status === 'registered' ? 'success' : 'warning'}>
                      {act.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono">
                    {new Date(act.updatedAt || act.registrationDate).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
