import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  BookOpen,
  AlertCircle,
  FileText,
  Layers,
  GraduationCap,
} from 'lucide-react';
import api from '../../services/api.js';
import { Badge } from '../../components/common/Badge.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';

export const AcademicPlannerPage = () => {
  const [progress, setProgress] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('progress'); // 'progress' | 'recommendations'

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [progRes, recRes] = await Promise.all([
          api.get('/academic/progress'),
          api.get('/academic/recommendations'),
        ]);

        setProgress(progRes.data?.data);
        setRecommendations(recRes.data?.data || []);
      } catch (err) {
        console.error('[Planner] Error loading planner data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Spinner size="lg" className="mx-auto" />
        <p className="text-xs text-slate-500 mt-3">Evaluating degree curriculum and recommendation rules...</p>
      </div>
    );
  }

  const completedCredits = progress?.completedCredits || 0;
  const registeredCredits = progress?.registeredCredits || 0;
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Academic Progress & Degree Planner</h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor verified degree milestones, completed course history, mandatory curriculum requirements, and rule-based course recommendations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('progress')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'progress'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Degree Progress & Curriculum Audit</span>
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'recommendations'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Rule-Based Recommendations ({recommendations.length})</span>
        </button>
      </div>

      {activeTab === 'progress' ? (
        <div className="space-y-6">
          {/* Degree Audit Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs uppercase font-bold tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                    Curriculum Audit
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                    isGraduationEligible
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}>
                    <GraduationCap className="w-3.5 h-3.5" />
                    Status: {graduationStatus}
                  </span>
                </div>

                <h2 className="text-xl font-extrabold text-slate-900 mt-2.5">
                  Bachelor of Technology in Information Technology
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  120 Total Earned Credits & {totalCoreCount} Mandatory Core Courses Required for Graduation
                </p>

                {/* Separate Indicator Badges */}
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
                  <div className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200">
                    Earned Credits: {completedCredits} / {degreeRequirement} ({creditPercentage}%)
                  </div>
                  <div className="bg-indigo-50 text-indigo-800 px-3 py-1.5 rounded-xl border border-indigo-200">
                    Mandatory Core: {completedCoreCount} / {totalCoreCount} Courses ({corePercentage}%)
                  </div>
                  <div className="bg-blue-50 text-blue-800 px-3 py-1.5 rounded-xl border border-blue-200">
                    Currently Enrolled: {registeredCredits} Credits
                  </div>
                  <div className="bg-slate-100 text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200">
                    Core Remaining: {remainingCoreCount} Courses ({remainingCoreCredits} cr)
                  </div>
                </div>

                {/* Graduation Ineligibility Explanation */}
                {!isGraduationEligible && (
                  <p className="mt-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-semibold text-slate-800">Graduation Audit:</span> {graduationReason}
                  </p>
                )}
              </div>

              {/* Progress Summary Cards */}
              <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <span className="text-2xl font-extrabold text-emerald-700">{creditPercentage}%</span>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">
                    Credits Earned
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <span className="text-2xl font-extrabold text-indigo-700">{corePercentage}%</span>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">
                    Core Satisfied
                  </span>
                </div>
              </div>
            </div>

            {/* Overall Progress Bars: Separate Indicators */}
            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Credit Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">Total Degree Credits Progress</span>
                  <span className="font-bold text-emerald-700">{completedCredits} / {degreeRequirement} cr ({creditPercentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                  <div
                    className="bg-emerald-600 h-3 transition-all duration-500"
                    style={{ width: `${Math.min(100, (completedCredits / degreeRequirement) * 100)}%` }}
                    title="Completed Credits"
                  />
                  <div
                    className="bg-blue-400 h-3 transition-all duration-500"
                    style={{ width: `${Math.min(100 - (completedCredits / degreeRequirement) * 100, (registeredCredits / degreeRequirement) * 100)}%` }}
                    title="Enrolled Credits"
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Earned: {completedCredits} cr</span>
                  <span>Enrolled: {registeredCredits} cr</span>
                  <span>Goal: {degreeRequirement} cr</span>
                </div>
              </div>

              {/* Core Courses Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">Mandatory Core Curriculum Progress</span>
                  <span className="font-bold text-indigo-700">{completedCoreCount} / {totalCoreCount} Courses ({corePercentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-3 transition-all duration-500"
                    style={{ width: `${corePercentage}%` }}
                    title="Core Courses Completed"
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Completed: {completedCoreCount} courses</span>
                  <span className="text-amber-700 font-semibold">{remainingCoreCount} remaining</span>
                  <span>Required: {totalCoreCount} courses</span>
                </div>
              </div>
            </div>
          </div>

          {/* Completed Courses Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Completed Academic Courses & Grades</h3>
                <p className="text-xs text-slate-500">
                  Official verified academic transcript records ({progress?.completedCourses?.length || 0} courses, {completedCredits} earned credits)
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700">
                Total Earned: {completedCredits} Credits
              </span>
            </div>

            {progress?.completedCourses && progress.completedCourses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Course Code</th>
                      <th className="py-3 px-4">Course Title</th>
                      <th className="py-3 px-4">Term Completed</th>
                      <th className="py-3 px-4">Credits Earned</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {progress.completedCourses.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {item.course?.courseCode || 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {item.course?.courseName || 'Unspecified Course'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{item.completedTerm || 'Prior Term'}</td>
                        <td className="py-3 px-4 text-slate-800 font-semibold">{item.creditsEarned} Credits</td>
                        <td className="py-3 px-4 capitalize">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            item.course?.courseType === 'core'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {item.course?.courseType || 'core'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Grade {item.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-8 text-center text-xs text-slate-500 italic">No historical completion records found.</p>
            )}
          </div>

          {/* Remaining Degree Required Courses */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Remaining Mandatory Core Degree Requirements</h3>
                <p className="text-xs text-slate-500">
                  Curriculum requirements that must be completed before graduation
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
                {remainingCoreCount} Courses Required • {remainingCoreCredits} Total Credits Remaining
              </span>
            </div>

            {progress?.remainingRequiredCourses && progress.remainingRequiredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {progress.remainingRequiredCourses.map((c) => (
                  <div key={c._id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-blue-700">{c.courseCode}</span>
                      <Badge variant="indigo">{c.credits} Credits</Badge>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{c.courseName}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">Recommended for Semester {c.recommendedSemester}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                All mandatory core curriculum requirements have been completed!
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Rule-Based Course Recommendations Tab */
        <div className="space-y-4">
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-950">Deterministic Academic Recommendation Engine</h4>
              <p className="mt-0.5 text-amber-800">
                Recommendations are ranked using transparent curriculum rules considering your completed prerequisites, semester standing, remaining degree requirements, available seats, and timetable compatibility.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div
                key={rec.course?._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                      {rec.course?.courseCode}
                    </span>
                    <Badge variant="indigo">{rec.course?.credits} Credits</Badge>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 capitalize">
                      {rec.course?.courseType}
                    </span>
                    {rec.eligible ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Eligible to Register
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Prerequisites / Criteria Incomplete
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{rec.course?.courseName}</h3>
                  <p className="text-xs text-slate-600 mt-1">{rec.course?.description}</p>

                  <div className="mt-3 space-y-1">
                    {rec.reasons.map((r, rIdx) => (
                      <div key={rIdx} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>

                  {rec.bestSection && (
                    <div className="mt-3 inline-flex items-center gap-3 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700">
                      <span className="font-semibold">Recommended Section: {rec.bestSection.sectionCode}</span>
                      <span>•</span>
                      <span>{rec.bestSection.availableSeats} seats open</span>
                      <span>•</span>
                      <span>{rec.bestSection.faculty}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end justify-between gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-semibold block">Fit Score</span>
                    <span className="text-xl font-extrabold text-blue-700">{rec.score} pts</span>
                  </div>

                  {rec.eligible && rec.bestSection && (
                    <Link
                      to="/catalog"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-all cursor-pointer whitespace-nowrap"
                    >
                      Enroll in Catalog
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
