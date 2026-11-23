import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import SubmitConfirmModal from '../components/SubmitConfirmModal';

export default function StudentDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [hasGroup, setHasGroup] = useState(false);
  const [studentContext, setStudentContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'submitted'
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/assignments');
      setHasGroup(res.data.has_group);
      setStudentContext(res.data.student_context || null);
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

  // Auto-dismiss toast message after 5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const totalCount = assignments.length;
  const submittedCount = assignments.filter((a) => a.submission?.submitted).length;
  const progressPercent = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;

  // Extract unique subjects for the filter dropdown
  const availableSubjects = [
    'all',
    ...Array.from(new Set(assignments.map((a) => a.subject).filter(Boolean))),
  ];

  const isOverdue = (dueDate, isSubmitted) => {
    return !isSubmitted && new Date(dueDate) < new Date();
  };

  const filteredAssignments = assignments.filter((a) => {
    const submitted = a.submission?.submitted;
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'pending'
        ? !submitted
        : submitted;

    const matchesSubject =
      subjectFilter === 'all' ? true : a.subject === subjectFilter;

    return matchesStatus && matchesSubject;
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

  const handleSubmissionSuccess = (submission) => {
    setAssignments((prev) =>
      prev.map((item) => {
        if (item.id === selectedAssignment.id) {
          return {
            ...item,
            submission: {
              submitted: true,
              confirmed_by_name: submission.confirmed_by_name || 'You',
              confirmed_at: submission.confirmed_at || new Date().toISOString(),
            },
          };
        }
        return item;
      })
    );
    setToastMessage(`Submission confirmed for "${selectedAssignment.title}"!`);
    setSelectedAssignment(null);
  };

  const handleSubmission409 = () => {
    setSelectedAssignment(null);
    setToastMessage('This assignment was already submitted. Syncing latest status...');
    fetchAssignments();
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage('')}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Top Banner Badge: Group or Individual */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 font-medium">Your Current Status:</div>
          {hasGroup ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              Group: {studentContext?.group_name || 'Active Team'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              Individual (no group)
            </span>
          )}
        </div>
        <Link
          to="/group"
          className="text-xs text-brand-600 font-semibold hover:text-brand-700 hover:underline flex items-center gap-1 self-start sm:self-auto"
        >
          {hasGroup ? 'View My Group Members' : 'Create or Join a Group'} &rarr;
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Student Dashboard
          </h1>
          <p className="text-slate-600 mt-1">
            Track your course assignments, cloud submission folders, and completion progress.
          </p>
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* Summary / Progress Bar */}
      {totalCount > 0 && (
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

      {/* Filter Tabs & Subject Dropdown Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'submitted', label: 'Submitted' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Subject Filter Dropdown */}
          <div className="flex items-center gap-3">
            <label htmlFor="subjectSelect" className="text-xs font-semibold text-slate-500">
              Subject:
            </label>
            <select
              id="subjectSelect"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 focus:ring-brand-500 focus:border-brand-500 bg-white shadow-sm"
            >
              {availableSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub === 'all' ? 'All Subjects' : sub}
                </option>
              ))}
            </select>

            <span className="text-xs font-medium text-slate-400 hidden sm:inline">
              ({filteredAssignments.length})
            </span>
          </div>
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
              {statusFilter === 'all' && subjectFilter === 'all'
                ? 'Your professors have not assigned any tasks yet.'
                : 'No assignments match your current filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssignments.map((assignment) => {
              const submitted = assignment.submission?.submitted;
              const overdue = isOverdue(assignment.due_date, submitted);
              const isGroupSubmission = assignment.submission_type === 'group';

              return (
                <div
                  key={assignment.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative"
                >
                  <div>
                    {/* Header: Subject & Submission Type Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {assignment.subject}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {isGroupSubmission ? '👥 Group submission' : '👤 Individual submission'}
                      </span>
                    </div>

                    {/* Title & Status Badge */}
                    <div className="flex items-start justify-between gap-3 mb-2">
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

                    {/* Professor name */}
                    <p className="text-xs text-slate-500 font-medium mb-3">
                      Professor: <span className="text-slate-700 font-semibold">{assignment.admin_name}</span>
                    </p>

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
                          {assignment.submission.confirmed_by_name || 'You'}
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

                      {!submitted && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setSelectedAssignment(assignment)}
                          className="w-full"
                        >
                          Mark as Submitted
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two-Step Confirmation Modal */}
      <SubmitConfirmModal
        assignment={selectedAssignment}
        isOpen={Boolean(selectedAssignment)}
        hasGroup={hasGroup && selectedAssignment?.submission_type !== 'individual'}
        onClose={() => setSelectedAssignment(null)}
        onSuccess={handleSubmissionSuccess}
        onError409={handleSubmission409}
      />
    </div>
  );
}
