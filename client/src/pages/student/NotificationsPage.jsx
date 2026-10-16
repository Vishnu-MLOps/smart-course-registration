import React, { useState } from 'react';
import { Bell, CheckCheck, Clock, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { Badge } from '../../components/common/Badge.jsx';

const notificationIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const badgeVariants = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'danger',
};

export const NotificationsPage = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Notifications</h1>
          <p className="text-xs text-slate-500 mt-1">
            Registration receipts, status alerts, academic schedule updates, and system advisories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-blue-600" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            filter === 'unread'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No notifications found</h3>
          <p className="text-xs text-slate-500 mt-1">You are all caught up on your course alerts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const Icon = notificationIcons[item.type] || Info;
            return (
              <div
                key={item._id}
                onClick={() => !item.isRead && markAsRead(item._id)}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer ${
                  item.isRead
                    ? 'bg-white border-slate-200 hover:border-slate-300'
                    : 'bg-blue-50/40 border-blue-200 shadow-xs'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl flex-shrink-0 ${
                    item.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700'
                      : item.type === 'error'
                      ? 'bg-rose-50 text-rose-700'
                      : item.type === 'warning'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      <Badge variant={badgeVariants[item.type]}>{item.type}</Badge>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{item.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
