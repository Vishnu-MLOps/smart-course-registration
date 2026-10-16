import React from 'react';
import { User, Mail, GraduationCap, Building, Calendar, Hash, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Badge } from '../../components/common/Badge.jsx';

export const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Academic Student Profile</h1>
        <p className="text-xs text-slate-500 mt-1">Verified institutional identity and registration records.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-navy-900 to-blue-800 p-6 flex items-end">
          <div className="translate-y-10 flex items-end gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-md border border-slate-200 flex items-center justify-center">
              <div className="w-full h-full bg-blue-600 rounded-xl flex items-center justify-center text-white text-2xl font-extrabold">
                {user?.name?.charAt(0) || 'S'}
              </div>
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
              <p className="text-xs text-slate-500 font-mono">{user?.registrationNumber}</p>
            </div>
          </div>
        </div>

        <div className="pt-14 p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Email Address</p>
                <p className="text-sm font-bold text-slate-800">{user?.email}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-3">
              <Building className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Department</p>
                <p className="text-sm font-bold text-slate-800">{user?.department}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Current Standing</p>
                <p className="text-sm font-bold text-slate-800">Semester {user?.semester}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">System Role</p>
                <Badge variant="indigo" className="mt-0.5">Enrolled Student</Badge>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Registration Policies
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Course registrations are verified according to department prerequisites, term credit limits (12–21 credits), and conflict-free weekly schedules. All changes are logged and timestamped under student ID {user?.registrationNumber}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
