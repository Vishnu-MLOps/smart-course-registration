import React, { useState, useEffect } from 'react';
import { Sliders, Save, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api.js';
import { Alert } from '../../components/common/Alert.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';

export const AdminRulesPage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRule, setActiveRule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/rules');
      const list = res.data?.data || [];
      setRules(list);
      if (list.length > 0) {
        setActiveRule(list[0]);
      }
    } catch (err) {
      console.error('[AdminRules] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!activeRule) return;

    setSaving(true);
    setFeedback(null);
    try {
      await api.put(`/admin/rules/${activeRule._id}`, {
        minimumCredits: Number(activeRule.minimumCredits),
        maximumCredits: Number(activeRule.maximumCredits),
        degreeCreditRequirement: Number(activeRule.degreeCreditRequirement),
      });
      setFeedback({ type: 'success', message: 'Academic registration rules updated successfully.' });
      await fetchRules();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to update academic rules.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Academic Policy & Credit Rules</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure term registration bounds, maximum credit overloads, and graduation requirements.
        </p>
      </div>

      {feedback && <Alert type={feedback.type} message={feedback.message} />}

      {loading ? (
        <div className="py-20 text-center">
          <Spinner size="lg" className="mx-auto" />
        </div>
      ) : activeRule ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">
                {activeRule.department} — {activeRule.academicTerm}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Enforced across all registration validation workflows</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Minimum Credits / Term
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={activeRule.minimumCredits}
                  onChange={(e) => setActiveRule({ ...activeRule, minimumCredits: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Full-time student minimum threshold.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Maximum Credits / Term
                </label>
                <input
                  type="number"
                  min="1"
                  max="35"
                  required
                  value={activeRule.maximumCredits}
                  onChange={(e) => setActiveRule({ ...activeRule, maximumCredits: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Rejects registrations exceeding this limit.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Graduation Requirement
                </label>
                <input
                  type="number"
                  min="60"
                  max="200"
                  required
                  value={activeRule.degreeCreditRequirement}
                  onChange={(e) =>
                    setActiveRule({ ...activeRule, degreeCreditRequirement: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Total degree completion target.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow cursor-pointer transition-colors"
              >
                {saving ? <Spinner size="sm" className="border-t-white" /> : <Save className="w-4 h-4" />}
                <span>Save Academic Policy</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-slate-500">No academic rules defined in system.</div>
      )}
    </div>
  );
};
