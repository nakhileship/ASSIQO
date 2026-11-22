import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';

export default function StudentDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [hasGroup, setHasGroup] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'submitted'

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/assignments');
      setHasGroup(res.data.has_group);
      setAssignments(res.data.assignments || []);
    } catch (err) {
      console.error('Failed to load assignments:', err);
      setError(err?.response?.data?.error || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const totalCount = assignments.length;
  const submittedCount = assignments.filter((a) => a.submission?.submitted).length;
  const progressPercent = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;

  const isOverdue = (dueDate, isSubmitted) => {
    return !isSubmitted && new Date(dueDate) < new Date();
  };

  const filteredAssignments = assignments.filter((a) => {
    const submitted = a.submission?.submitted;
    if (filter === 'pending') return !submitted;
    if (filter === 'submitted') return submitted;
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="lg" text="Loading your assignments..." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Student Dashboard
          </h1>
          <p className="text-slate-600 mt-1">
            Track your group assignments, submission links, and completion status.
          </p>
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* No Group Banner */}
      {!hasGroup && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-base">You are not in a group yet</h3>
              <p className="text-amber-800/90 text-sm mt-0.5">
                Join or create a team to see your assigned tasks and submit your group project.
              </p>
            </div>
          </div>
          <Link to="/group">
            <Button variant="primary" className="whitespace-nowrap">
              Go to My Group &rarr;
            </Button>
          </Link>
        </div>
      )}

      {/* Summary / Progress Bar */}
      {hasGroup && totalCount > 0 && (
        <Card className="bg-gradient-to-br from-white to-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Overall Progress</h2>
              <p className="text-sm text-slate-500">
                {submittedCount} of {totalCount} assignments completed
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-brand-600">{progressPercent}%</span>
              <span className="text-xs uppercase font-bold text-slate-400">Completed</span>
            </div>
          </div>

          {/* Progress track */}
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
            <div
              className="bg-brand-600 h-full rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </Card>
      )}

      {/* Filter Tabs & Content Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'submitted', label: 'Submitted' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                  filter === tab.id
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-medium text-slate-500">
            Showing {filteredAssignments.length} assignment{filteredAssignments.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Assignment Cards Grid */}
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 p-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">No assignments found</h3>
            <p className="text-sm text-slate-500 mt-1">
              {filter === 'all'
                ? 'Your professor has not assigned any tasks yet.'
                : `There are currently no ${filter} assignments.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssignments.map((assignment) => {
              const submitted = assignment.submission?.submitted;
              const overdue = isOverdue(assignment.due_date, submitted);

              return (
                <div
                  key={assignment.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative"
                >
                  <div>
                    {/* Header: Title & Status Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-bold text-lg text-slate-900 leading-snug">
                        {assignment.title}
                      </h3>
                      {submitted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Submitted
                        </span>
                      ) : overdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Pending
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                      {assignment.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Metadata and Actions */}
                  <div className="pt-4 border-t border-slate-100 space-y-3 mt-2">
                    {/* Due Date */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-medium">Due Date:</span>
                      <span className={overdue ? 'text-rose-600 font-bold' : 'font-semibold text-slate-700'}>
                        {formatDate(assignment.due_date)}
                      </span>
                    </div>

                    {/* Submission metadata if submitted */}
                    {submitted && (
                      <div className="bg-emerald-50/70 rounded-xl p-2.5 border border-emerald-100 text-xs text-emerald-900 space-y-0.5">
                        <p>
                          <span className="font-semibold">Confirmed by:</span>{' '}
                          {assignment.submission.confirmed_by_name || 'Group member'}
                        </p>
                        <p className="text-emerald-700">
                          {formatDate(assignment.submission.confirmed_at)}
                        </p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 pt-1">
                      {assignment.onedrive_link && (
                        <a
                          href={assignment.onedrive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-sm"
                        >
                          <svg className="w-4 h-4 text-sky-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                          </svg>
                          Open submission link &rarr;
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
