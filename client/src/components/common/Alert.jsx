import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const icons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const styles = {
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  error: 'bg-rose-50 text-rose-800 border-rose-200',
};

export const Alert = ({ type = 'info', title, message, className = '', children }) => {
  const Icon = icons[type] || Info;
  const style = styles[type] || styles.info;

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${style} ${className}`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && <h4 className="font-semibold">{title}</h4>}
        {message && <p className={title ? 'mt-1' : ''}>{message}</p>}
        {children}
      </div>
    </div>
  );
};
