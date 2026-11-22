import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin, isStudent } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navLinkClasses = ({ isActive }) =>
    `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-50 text-brand-700 font-semibold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
    }`;

  const homePath = isAdmin ? '/admin' : '/dashboard';

  return (
    <nav className="bg-white border-b border-slate-200/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left section: Logo & Nav Links */}
          <div className="flex items-center gap-8">
            <Link to={homePath} className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <span className="text-white font-extrabold text-lg tracking-wider">A</span>
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                ASSIQO
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-1.5">
              {isStudent && (
                <>
                  <NavLink to="/dashboard" className={navLinkClasses}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/group" className={navLinkClasses}>
                    My Group
                  </NavLink>
                </>
              )}

              {isAdmin && (
                <>
                  <NavLink to="/admin" end className={navLinkClasses}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/admin/assignments" className={navLinkClasses}>
                    Assignments
                  </NavLink>
                </>
              )}
            </div>
          </div>

          {/* Right section: User info & Logout */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-3 pr-2">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900 leading-tight">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  isAdmin
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
              >
                {user?.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200/80"
              title="Sign Out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/80 bg-white px-4 pt-3 pb-5 space-y-3">
          <div className="space-y-1">
            {isStudent && (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-base font-medium text-slate-700 hover:bg-slate-100"
                >
                  Dashboard
                </Link>
                <Link
                  to="/group"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-base font-medium text-slate-700 hover:bg-slate-100"
                >
                  My Group
                </Link>
              </>
            )}

            {isAdmin && (
              <>
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-base font-medium text-slate-700 hover:bg-slate-100"
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/assignments"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-base font-medium text-slate-700 hover:bg-slate-100"
                >
                  Assignments
                </Link>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm font-semibold text-rose-600 hover:text-rose-700"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
