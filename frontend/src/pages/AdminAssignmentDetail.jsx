import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useAuth } from '../context/AuthContext';

export default function AdminAssignmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('group'); // 'group' | 'student'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'confirmed' | 'pending'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/admin/assignments/${id}/submissions`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load submissions:', err);
      setError(err?.response?.data?.error || 'Failed to load assignment submissions tracking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="lg" text="Loading submission tracking data..." />
      </div>
    );
  }

  const { assignment, summary, group_wise = [], student_wise = [] } = data || {};

  const totalGroups = summary?.total_assigned_groups || 0;
  const confirmedGroups = summary?.confirmed_groups || 0;
  const pendingGroups = summary?.pending_groups || 0;
  const completionPercent = totalGroups > 0 ? Math.round((confirmedGroups / totalGroups) * 100) : 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter Group-wise list
  const filteredGroups = group_wise.filter((g) => {
    const matchesStatus =
      statusFilter === 'all' ? true : g.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesSearch =
      searchQuery.trim() === '' ||
      g.group_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.members.some(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesStatus && matchesSearch;
  });

  // Filter Student-wise list
  const filteredStudents = student_wise.filter((s) => {
    const matchesStatus =
      statusFilter === 'all' ? true : s.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesSearch =
      searchQuery.trim() === '' ||
      s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.group_name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Back button & Title Section */}
      <div className="space-y-2">
        <Link
          to="/admin/assignments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Assignments
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {assignment?.title || `Assignment #${id}`}
              </h1>
              {user?.subject && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  {user.subject}
                </span>
              )}
              {assignment?.assign_mode === 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  All Students
                </span>
              )}
              {assignment?.assign_mode === 'groups' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  Specific Groups
                </span>
              )}
              {assignment?.assign_mode === 'students' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Specific Students
                </span>
              )}
            </div>
            <p className="text-slate-600 text-sm mt-1 max-w-3xl">
              {assignment?.description || 'No description provided.'}
            </p>
          </div>

          {assignment?.onedrive_link && (
            <a
              href={assignment.onedrive_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-brand-600 transition-colors shadow-sm self-start sm:self-auto"
            >
              <svg className="w-4 h-4 text-sky-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
              </svg>
              Open OneDrive Folder &rarr;
            </a>
          )}
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* Progress & Summary Bar */}
      <Card className="bg-gradient-to-br from-white to-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Submission Progress</h2>
            <p className="text-xs text-slate-500">
              {confirmedGroups} of {totalGroups} assigned groups have confirmed submission
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-emerald-600">{completionPercent}%</span>
            <div className="text-right text-xs">
              <p className="font-semibold text-slate-700">{summary?.total_students || 0} Students</p>
              <p className="text-slate-400">Total in assigned groups</p>
            </div>
          </div>
        </div>

        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Due Date:</span>
            <p className="font-bold text-slate-800 mt-0.5">{formatDate(assignment?.due_date)}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Assigned Groups:</span>
            <p className="font-bold text-slate-800 mt-0.5">{totalGroups}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Confirmed Groups:</span>
            <p className="font-bold text-emerald-600 mt-0.5">{confirmedGroups}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Pending Groups:</span>
            <p className="font-bold text-amber-600 mt-0.5">{pendingGroups}</p>
          </div>
        </div>
      </Card>

      {/* Submissions Table Section */}
      <div className="space-y-4">
        {/* Tab switcher + Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-3 border-b border-slate-200/80">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('group')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'group'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Group-wise View ({group_wise.length})
            </button>
            <button
              onClick={() => setActiveTab('student')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'student'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Student-wise View ({student_wise.length})
            </button>
          </div>

          {/* Filters: Status + Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
              {['all', 'confirmed', 'pending'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    statusFilter === s
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-brand-500 focus:border-brand-500 bg-white shadow-sm w-44 sm:w-56"
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-2.5 top-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Tab 1: Group-wise Table */}
        {activeTab === 'group' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-6">Group Name</th>
                    <th className="py-3.5 px-6">Team Members</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Confirmed By</th>
                    <th className="py-3.5 px-6">Confirmed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                        No groups match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredGroups.map((g) => {
                      const isConfirmed = g.status === 'confirmed';

                      return (
                        <tr key={g.group_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap">
                            {g.group_name}
                          </td>
                          <td className="py-4 px-6 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {g.members?.length > 0 ? (
                                g.members.map((m) => (
                                  <span
                                    key={m.id}
                                    title={m.email}
                                    className="inline-block px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                  >
                                    {m.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400 italic">No members</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            {isConfirmed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Confirmed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-xs whitespace-nowrap">
                            {isConfirmed && g.confirmed_by ? (
                              <div>
                                <p className="font-semibold text-slate-900">{g.confirmed_by.name}</p>
                                <p className="text-slate-400">{g.confirmed_by.email}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400">&mdash;</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                            {isConfirmed ? formatDate(g.confirmed_at) : <span className="text-slate-400">&mdash;</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Student-wise Table */}
        {activeTab === 'student' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-6">Student Name</th>
                    <th className="py-3.5 px-6">Email Address</th>
                    <th className="py-3.5 px-6">Group Name</th>
                    <th className="py-3.5 px-6">Type</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Confirmed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                        No students match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => {
                      const isConfirmed = s.status === 'confirmed';

                      return (
                        <tr key={s.student_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap">
                            {s.student_name}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                            {s.student_email}
                          </td>
                          <td className="py-4 px-6 font-medium text-slate-800 whitespace-nowrap">
                            {s.group_name}
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                s.type === 'Group'
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                  : 'bg-blue-100 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {s.type || 'Individual'}
                            </span>
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            {isConfirmed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Confirmed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                            {isConfirmed ? (
                              <span>
                                {s.confirmed_by_name || 'Group member'}{' '}
                                <span className="text-slate-400">({formatDate(s.confirmed_at)})</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">&mdash;</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
