import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import api from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err?.response?.data?.error || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="lg" text="Loading analytics..." />
      </div>
    );
  }

  const {
    total_students = 0,
    total_groups = 0,
    total_assignments = 0,
    total_confirmed_submissions = 0,
    overall_completion_percentage = 0,
    per_assignment = [],
  } = analytics || {};

  // Custom Recharts tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const confirmed = payload.find((p) => p.dataKey === 'confirmed')?.value || 0;
      const pending = payload.find((p) => p.dataKey === 'pending')?.value || 0;
      const total = confirmed + pending;
      const rate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[180px]">
          <p className="font-bold text-sm text-slate-100 border-b border-slate-800 pb-1 truncate max-w-[220px]">
            {label}
          </p>
          <div className="flex items-center justify-between text-emerald-400 font-medium">
            <span>Confirmed:</span>
            <span className="font-bold">{confirmed}</span>
          </div>
          <div className="flex items-center justify-between text-amber-400 font-medium">
            <span>Pending:</span>
            <span className="font-bold">{pending}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800">
            <span>Total Assigned:</span>
            <span className="font-bold">{total} ({rate}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Admin Analytics Dashboard
            </h1>
            {user?.subject && (
              <span className="text-xs font-bold px-3 py-1 bg-purple-100 text-purple-800 rounded-full border border-purple-200">
                {user.subject}
              </span>
            )}
          </div>
          <p className="text-slate-600 mt-1">
            Real-time tracking of student submissions for your subject assignments.
          </p>
        </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalytics}
              disabled={loading}
              className="gap-1.5 text-xs text-slate-600 font-semibold"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
            <Link to="/admin/assignments">
              <Button variant="primary" size="sm" className="gap-2 font-semibold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Assignment
              </Button>
            </Link>
          </div>
        </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* 5 Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Students</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900">{total_students}</p>
            <p className="text-xs text-slate-500 mt-0.5">Enrolled students</p>
          </div>
        </div>

        {/* Total Groups */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Groups</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900">{total_groups}</p>
            <p className="text-xs text-slate-500 mt-0.5">Formed teams</p>
          </div>
        </div>

        {/* Total Assignments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Assignments</span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900">{total_assignments}</p>
            <p className="text-xs text-slate-500 mt-0.5">Tasks assigned</p>
          </div>
        </div>

        {/* Confirmed Submissions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Confirmed</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900">{total_confirmed_submissions}</p>
            <p className="text-xs text-slate-500 mt-0.5">Submissions verified</p>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Completion</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900">{overall_completion_percentage}%</p>
            <p className="text-xs text-slate-500 mt-0.5">Overall completion</p>
          </div>
        </div>
      </div>

      {/* Recharts Stacked Bar Chart */}
      <Card
        title="Assignment Submissions Breakdown"
        subtitle="Group confirmation rates for each posted assignment (Confirmed vs Pending)."
      >
        {per_assignment.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">No assignment data yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Create an assignment to start tracking group completion status and progress charts.
            </p>
            <Link to="/admin/assignments" className="inline-block mt-4">
              <Button variant="primary" size="sm">
                Create First Assignment
              </Button>
            </Link>
          </div>
        ) : (
          <div className="h-80 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={per_assignment}
                margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="title"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  interval={0}
                  tickFormatter={(val) => (val.length > 18 ? `${val.slice(0, 16)}...` : val)}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '20px', fontSize: '13px' }}
                />
                <Bar
                  dataKey="confirmed"
                  name="Confirmed"
                  stackId="submissions"
                  fill="#10b981"
                  radius={[0, 0, 4, 4]}
                />
                <Bar
                  dataKey="pending"
                  name="Pending"
                  stackId="submissions"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
