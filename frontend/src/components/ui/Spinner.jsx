import React from 'react';

export const Spinner = ({ size = 'md', className = '', text }) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-10 w-10 border-3',
  };

  return (
    <div className={`flex items-center justify-center gap-2.5 ${className}`}>
      <div
        className={`animate-spin rounded-full border-brand-200 border-t-brand-600 ${sizeClasses[size] || sizeClasses.md}`}
      />
      {text && <span className="text-sm font-medium text-slate-600">{text}</span>}
    </div>
  );
};
