import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, User, List, Grid, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { Spinner } from '../../components/common/Spinner.jsx';
import { Badge } from '../../components/common/Badge.jsx';

export const TimetablePage = () => {
  const [timetableData, setTimetableData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const res = await api.get('/academic/timetable');
      setTimetableData(res.data?.data);
    } catch (err) {
      console.error('[Timetable] Error loading timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Time slots from 08:00 to 18:00
  const timeSlots = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
  ];

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Spinner size="lg" className="mx-auto" />
        <p className="text-xs text-slate-500 mt-3">Rendering weekly class timetable...</p>
      </div>
    );
  }

  const timetableByDay = timetableData?.timetableByDay || {};
  const flatMeetings = timetableData?.flatMeetings || [];
  const totalClasses = timetableData?.totalWeeklyClasses || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Weekly Class Schedule</h1>
          <p className="text-xs text-slate-500 mt-1">
            Conflict-free weekly schedule for confirmed Fall 2026 course registrations.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 border border-slate-300/60">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Day-by-Day List</span>
            </button>
          </div>
        </div>
      </div>

      {totalClasses === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Your weekly timetable is empty</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You have not registered for any active courses yet. Once you register, your class meetings will appear on this schedule.
          </p>
          <Link
            to="/catalog"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Register for Courses
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        /* Calendar Grid View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Monday – Saturday Schedule Grid
            </span>
            <span className="text-xs font-medium text-slate-500">
              {totalClasses} Weekly Meetings • {timetableData?.totalRegisteredCourses} Courses
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              {/* Day Header Row */}
              <div className="grid grid-cols-6 border-b border-slate-200 bg-slate-100/60 text-center">
                {days.map((day) => (
                  <div key={day} className="py-3 px-2 border-r border-slate-200 last:border-r-0">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">{day}</span>
                    <span className="block text-[10px] text-slate-500 font-medium mt-0.5">
                      {timetableByDay[day]?.length || 0} classes
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              <div className="grid grid-cols-6 min-h-[460px] divide-x divide-slate-200">
                {days.map((day) => {
                  const meetings = timetableByDay[day] || [];
                  return (
                    <div key={day} className="p-2 space-y-2 bg-slate-50/20">
                      {meetings.length === 0 ? (
                        <div className="h-full flex items-center justify-center p-4">
                          <span className="text-[11px] text-slate-300 italic">No classes scheduled</span>
                        </div>
                      ) : (
                        meetings.map((m, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border text-left shadow-xs transition-transform hover:-translate-y-0.5 ${
                              m.colorTheme?.bg || 'bg-blue-50 border-blue-200 text-blue-950'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-xs font-bold leading-none">
                                {m.courseCode}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 border border-current">
                                Sec {m.sectionCode}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold line-clamp-1 leading-tight mb-1">
                              {m.courseName}
                            </h4>

                            <div className="space-y-0.5 text-[11px] opacity-90">
                              <div className="flex items-center gap-1 font-mono font-semibold">
                                <Clock className="w-3 h-3 flex-shrink-0" />
                                <span>{m.startTime} – {m.endTime}</span>
                              </div>
                              <div className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span>{m.room}</span>
                              </div>
                              <div className="flex items-center gap-1 truncate">
                                <User className="w-3 h-3 flex-shrink-0" />
                                <span>{m.faculty}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Accessible Day-by-Day List View (Mobile friendly) */
        <div className="space-y-4">
          {days.map((day) => {
            const meetings = timetableByDay[day] || [];
            return (
              <div key={day} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">{day}</span>
                  <Badge variant={meetings.length > 0 ? 'indigo' : 'slate'}>
                    {meetings.length} {meetings.length === 1 ? 'Meeting' : 'Meetings'}
                  </Badge>
                </div>

                <div className="p-4">
                  {meetings.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No scheduled classes on this day.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {meetings.map((m, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border flex flex-col justify-between ${
                            m.colorTheme?.bg || 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-mono text-xs font-bold">{m.courseCode}</span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white border border-current">
                                Section {m.sectionCode}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold mb-2">{m.courseName}</h4>
                            <div className="space-y-1 text-xs opacity-90">
                              <p className="flex items-center gap-1.5 font-mono font-bold">
                                <Clock className="w-3.5 h-3.5" />
                                {m.startTime} – {m.endTime}
                              </p>
                              <p className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                {m.room}
                              </p>
                              <p className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                {m.faculty}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
