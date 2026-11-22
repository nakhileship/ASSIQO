import React from 'react';

export const Input = ({
  label,
  id,
  type = 'text',
  error,
  helperText,
  className = '',
  required = false,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        className={`block w-full px-3.5 py-2.5 rounded-xl border sm:text-sm transition-colors shadow-sm ${
          error
            ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20'
            : 'border-slate-300 focus:ring-brand-500 focus:border-brand-500 bg-white'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
};
