import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    subject: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect
  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  const validate = () => {
    const errors = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Invalid email address';
    }

    if (!formData.password || formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!['student', 'admin'].includes(formData.role)) {
      errors.role = 'Please select a valid role';
    }

    if (formData.role === 'admin' && (!formData.subject.trim() || formData.subject.trim().length < 2)) {
      errors.subject = 'Subject is required for admin accounts (min 2 characters)';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const newUser = await register(
        formData.name.trim(),
        formData.email.trim(),
        formData.password,
        formData.role,
        formData.role === 'admin' ? formData.subject.trim() : null
      );

      if (newUser.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error || 'Registration failed. Please check inputs and try again.';
      setApiError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <span className="text-white font-extrabold text-2xl tracking-wider">A</span>
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Create an ASSIQO Account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Join as a student or register as a professor / admin
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
          {apiError && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
              <svg className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{apiError}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Full Name</label>
              <div className="mt-1">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                  }}
                  className={`block w-full px-3.5 py-2.5 rounded-xl border ${
                    fieldErrors.name
                      ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-brand-500 focus:border-brand-500'
                  } shadow-sm sm:text-sm transition-colors`}
                  placeholder="Alice Johnson"
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.name}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Email Address</label>
              <div className="mt-1">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                  }}
                  className={`block w-full px-3.5 py-2.5 rounded-xl border ${
                    fieldErrors.email
                      ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-brand-500 focus:border-brand-500'
                  } shadow-sm sm:text-sm transition-colors`}
                  placeholder="alice@assiqo.dev"
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                  }}
                  className={`block w-full px-3.5 py-2.5 rounded-xl border ${
                    fieldErrors.password
                      ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-brand-500 focus:border-brand-500'
                  } shadow-sm sm:text-sm transition-colors`}
                  placeholder="At least 6 characters"
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.password}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Account Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'student' })}
                  className={`py-2.5 px-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    formData.role === 'student'
                      ? 'border-brand-600 bg-brand-50/80 text-brand-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${formData.role === 'student' ? 'bg-brand-600' : 'bg-slate-300'}`} />
                  Student
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'admin' })}
                  className={`py-2.5 px-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    formData.role === 'admin'
                      ? 'border-brand-600 bg-brand-50/80 text-brand-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${formData.role === 'admin' ? 'bg-brand-600' : 'bg-slate-300'}`} />
                  Admin / Prof
                </button>
              </div>
            </div>

            {formData.role === 'admin' && (
              <div className="animate-in fade-in duration-150">
                <label className="block text-sm font-medium text-slate-700">Subject / Course Taught</label>
                <div className="mt-1">
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => {
                      setFormData({ ...formData, subject: e.target.value });
                      if (fieldErrors.subject) setFieldErrors({ ...fieldErrors, subject: '' });
                    }}
                    className={`block w-full px-3.5 py-2.5 rounded-xl border ${
                      fieldErrors.subject
                        ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
                        : 'border-slate-300 focus:ring-brand-500 focus:border-brand-500'
                    } shadow-sm sm:text-sm transition-colors`}
                    placeholder="e.g. Data Structures, Web Development"
                  />
                  {fieldErrors.subject && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.subject}</p>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-200/80 pt-5 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-500">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
