import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Award,
  Calendar,
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  User,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Layers,
} from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { StatCard } from '../../components/common/StatCard.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [progRes, recRes, timeRes] = await Promise.all([
          api.get('/academic/progress'),
          api.get('/academic/recommendations'),
          api.get('/academic/timetable'),
        ]);

        setProgress(progRes.data?.data);
        setRecommendations(recRes.data?.data?.slice(0, 3) || []);
        setTimetable(timeRes.data?.data);
      } catch (err) {
        console.error('[Dashboard] Error fetching data:', err);
        setError('Failed to load dashboard metrics from server.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-slate-500">Loading student academic profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  const registeredCredits = progress?.registeredCredits || 0;
  const maxCredits = progress?.maximumCreditsAllowed || 21;
  const creditUsagePercentage = Math.min(100, Math.round((registeredCredits / maxCredits) * 100));

  const completedCredits = progress?.completedCredits || 0;
  const degreeRequirement = progress?.degreeCreditRequirement || 120;
  const creditPercentage = progress?.creditProgressPercentage || Math.min(100, Math.round((completedCredits / degreeRequirement) * 100));

  const totalCoreCount = progress?.totalCoreCoursesCount || 0;
  const completedCoreCount = progress?.completedCoreCoursesCount || 0;
  const remainingCoreCount = progress?.remainingCoreCoursesCount || 0;
  const remainingCoreCredits = progress?.remainingCoreCredits || 0;
  const corePercentage = progress?.coreProgressPercentage || 0;

  const isGraduationEligible = progress?.isGraduationEligible || false;
  const graduationStatus = progress?.graduationStatus || 'In Progress';
  const graduationReason = progress?.graduationStatusReason || '';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-navy-900 to-navy-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase font-bold tracking-widest text-blue-300">
                  {user?.department}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-xs text-slate-300 font-medium">Semester {user?.semester}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {user?.name}
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Student ID: <span className="font-mono text-white font-semibold">{user?.registrationNumber}</span> | Fall 2026 Academic Term
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                Browse Catalog
              </Link>
              <Link
                to="/timetable"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-700/80 hover:bg-navy-700 text-white text-xs font-semibold border border-navy-600 transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                View Timetable
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row - Distinct & Validated Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Degree Credits Completed"
          value={`${completedCredits} / ${degreeRequirement} cr`}
          subtitle={`${creditPercentage}% degree credit threshold met`}
          icon={Award}
          color="emerald"
        />
        <StatCard
          title="Mandatory Core Curriculum"
          value={`${completedCoreCount} / ${totalCoreCount} Courses`}
          subtitle={`${remainingCoreCount} core courses remaining (${remainingCoreCredits} cr)`}
          icon={Layers}
          color="indigo"
        />
        <StatCard
          title="Term Registered Credits"
          value={`${registeredCredits} / ${maxCredits} cr`}
          subtitle={`${maxCredits - registeredCredits} credits available to add`}
          icon={BookOpen}
          color="blue"
        />
        <StatCard
          title="Graduation Eligibility"
          value={isGraduationEligible ? 'Graduation Ready' : 'In Progress'}
          subtitle={graduationReason}
          icon={GraduationCap}
          color={isGraduationEligible ? 'emerald' : 'amber'}
        />
      </div>

      {/* Graduation Status Banner when Requirements are Pending */}
      {!isGraduationEligible && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4.5 flex items-start gap-3.5 text-xs text-amber-950 shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-sm text-amber-900">Graduation Status: {graduationStatus}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-200/70 text-amber-900">
                Mandatory Curriculum Pending
              </span>
            </div>
            <p className="mt-1 text-slate-700 leading-relaxed">
              Graduation requires both fulfilling the <span className="font-semibold text-slate-900">{degreeRequirement} earned credit requirement</span> and completing <span className="font-semibold text-slate-900">all {totalCoreCount} mandatory core courses</span>. You currently have <span className="font-semibold text-slate-900">{remainingCoreCount} core courses ({remainingCoreCredits} credits)</span> remaining before degree completion can be certified.
            </p>
          </div>
        </div>
      )}

      {/* Progress Bars Row - Separate Indicators for Credits, Core Curriculum, and Term Allowance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Degree Credit Progress Gauge */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Credit Threshold
                </span>
                <h2 className="text-sm font-bold text-slate-900">Earned Degree Credits</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">{degreeRequirement} total earned credits required for graduation</p>
            </div>
            <span className="text-sm font-bold text-emerald-700">{creditPercentage}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${creditPercentage}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Completed: {completedCredits} cr</span>
            <span className="font-semibold text-slate-700">Projected: {progress?.projectedTotalCredits || 0} cr</span>
            <span>Target: {degreeRequirement} cr</span>
          </div>
        </div>

        {/* Mandatory Core Courses Progress Gauge */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  Curriculum Audit
                </span>
                <h2 className="text-sm font-bold text-slate-900">Mandatory Core Courses</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">{totalCoreCount} specific department core courses required</p>
            </div>
            <span className="text-sm font-bold text-indigo-700">{corePercentage}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${corePercentage}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Completed: {completedCoreCount} courses</span>
            <span className="font-semibold text-amber-700">{remainingCoreCount} remaining ({remainingCoreCredits} cr)</span>
            <span>Total: {totalCoreCount} courses</span>
          </div>
        </div>
      </div>

      {/* Main Content Split: Registered Courses & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Registered Courses (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Fall 2026 Registered Courses</h2>
              <p className="text-xs text-slate-500">
                {progress?.registeredCourses?.length || 0} courses confirmed in timetable ({registeredCredits} enrolled credits)
              </p>
            </div>
            <Link
              to="/registrations"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {progress?.registeredCourses && progress.registeredCourses.length > 0 ? (
            <div className="space-y-3">
              {progress.registeredCourses.map((item) => (
                <div
                  key={item.enrollmentId}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {item.course?.courseCode}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        Section {item.section?.sectionCode}
                      </span>
                      <Badge variant="emerald">{item.course?.credits} Credits</Badge>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{item.course?.courseName}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> {item.section?.faculty}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {item.section?.room}
                      </span>
                    </div>
                  </div>

                  {item.section?.schedule && (
                    <div className="text-xs bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-600">
                      <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> Meeting Times:
                      </div>
                      {item.section.schedule.map((s, idx) => (
                        <div key={idx} className="text-[11px] text-slate-500">
                          {s.day}: {s.startTime} - {s.endTime}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">No courses registered for Fall 2026</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Explore recommended courses from your academic plan or browse the course catalog to enroll.
              </p>
              <Link
                to="/catalog"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-all shadow"
              >
                Open Course Catalog
              </Link>
            </div>
          )}
        </div>

        {/* Course Recommendations Widget (1 Column) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> Recommended
              </h2>
              <p className="text-xs text-slate-500">Tailored to your degree plan</p>
            </div>
            <Link
              to="/planner"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              All ({recommendations.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 flex-1">
            {recommendations.length > 0 ? (
              recommendations.map((rec) => (
                <div
                  key={rec.course?._id}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50/40 hover:bg-white transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-blue-700">
                      {rec.course?.courseCode}
                    </span>
                    <Badge variant="indigo">{rec.course?.credits} Credits</Badge>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1">
                    {rec.course?.courseName}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {rec.recommendationSummary}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-8">
                No new course recommendations currently available.
              </p>
            )}
          </div>

          <Link
            to="/planner"
            className="mt-4 block text-center py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
          >
            Open Academic Degree Planner
          </Link>
        </div>
      </div>
    </div>
  );
};
