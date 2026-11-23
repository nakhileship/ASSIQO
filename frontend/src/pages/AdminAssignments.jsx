import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useAuth } from '../context/AuthContext';

export default function AdminAssignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    onedrive_link: '',
    assign_mode: 'all', // 'all' | 'groups' | 'students'
    group_ids: [],
    student_ids: [],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [assnRes, grpRes, stdRes] = await Promise.all([
        api.get('/admin/assignments'),
        api.get('/admin/groups'),
        api.get('/admin/students'),
      ]);
      setAssignments(assnRes.data.assignments || []);
      setAvailableGroups(grpRes.data.groups || []);
      setAvailableStudents(stdRes.data.students || []);
    } catch (err) {
      console.error('Failed to load assignments data:', err);
      setError(err?.response?.data?.error || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const openCreateModal = () => {
    setEditingAssignment(null);
    setStudentSearch('');
    // Default due date: 7 days from now formatted for datetime-local (YYYY-MM-DDTHH:mm)
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const tzOffset = futureDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(futureDate.getTime() - tzOffset).toISOString().slice(0, 16);

    setFormData({
      title: '',
      description: '',
      due_date: localISOTime,
      onedrive_link: '',
      assign_mode: 'all',
      group_ids: [],
      student_ids: [],
    });
    setFormError('');
    setFieldErrors({});
    setIsFormOpen(true);
  };

  const openEditModal = (assignment) => {
    setEditingAssignment(assignment);
    setStudentSearch('');

    let formattedDue = '';
    if (assignment.due_date) {
      const d = new Date(assignment.due_date);
      const tzOffset = d.getTimezoneOffset() * 60000;
      formattedDue = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    }

    const mode = assignment.assign_mode || (assignment.assign_to_all ? 'all' : 'groups');

    setFormData({
      title: assignment.title || '',
      description: assignment.description || '',
      due_date: formattedDue,
      onedrive_link: assignment.onedrive_link || '',
      assign_mode: mode,
      group_ids: assignment.assigned_group_ids || [],
      student_ids: assignment.assigned_student_ids || [],
    });
    setFormError('');
    setFieldErrors({});
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    if (formSubmitting) return;
    setIsFormOpen(false);
    setEditingAssignment(null);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim() || formData.title.trim().length < 2) {
      errors.title = 'Title must be at least 2 characters';
    }

    if (!formData.due_date) {
      errors.due_date = 'Due date is required';
    }

    if (!formData.onedrive_link.trim()) {
      errors.onedrive_link = 'OneDrive link is required';
    } else {
      try {
        new URL(formData.onedrive_link.trim());
      } catch {
        errors.onedrive_link = 'Must be a valid URL (e.g. https://onedrive.live.com/...)';
      }
    }

    if (formData.assign_mode === 'groups' && formData.group_ids.length === 0) {
      errors.group_ids = 'Please select at least one group';
    }

    if (formData.assign_mode === 'students' && formData.student_ids.length === 0) {
      errors.student_ids = 'Please select at least one student';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) return;

    setFormSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        due_date: new Date(formData.due_date).toISOString(),
        onedrive_link: formData.onedrive_link.trim(),
        assign_mode: formData.assign_mode,
        assign_to_all: formData.assign_mode === 'all',
        group_ids: formData.assign_mode === 'groups' ? formData.group_ids : [],
        student_ids: formData.assign_mode === 'students' ? formData.student_ids : [],
      };

      if (editingAssignment) {
        await api.put(`/admin/assignments/${editingAssignment.id}`, payload);
        setToastMessage(`Assignment "${payload.title}" updated successfully!`);
      } else {
        await api.post('/admin/assignments', payload);
        setToastMessage(`Assignment "${payload.title}" created successfully!`);
      }

      setIsFormOpen(false);
      setEditingAssignment(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to save assignment:', err);
      setFormError(err?.response?.data?.error || 'Failed to save assignment');
    } finally {
      setFormSubmitting(false);
    }
  };

  const toggleGroupSelection = (groupId) => {
    setFormData((prev) => {
      const exists = prev.group_ids.includes(groupId);
      const newIds = exists
        ? prev.group_ids.filter((id) => id !== groupId)
        : [...prev.group_ids, groupId];
      return { ...prev, group_ids: newIds };
    });
    if (fieldErrors.group_ids) setFieldErrors({ ...fieldErrors, group_ids: '' });
  };

  const toggleStudentSelection = (studentId) => {
    setFormData((prev) => {
      const exists = prev.student_ids.includes(studentId);
      const newIds = exists
        ? prev.student_ids.filter((id) => id !== studentId)
        : [...prev.student_ids, studentId];
      return { ...prev, student_ids: newIds };
    });
    if (fieldErrors.student_ids) setFieldErrors({ ...fieldErrors, student_ids: '' });
  };

  const filteredStudents = availableStudents.filter((s) => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.group_name && s.group_name.toLowerCase().includes(q))
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
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
        <Spinner size="lg" text="Loading assignments..." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toast Message */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="text-emerald-600 hover:text-emerald-800 p-1">
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Assignments Management
            </h1>
            {user?.subject && (
              <span className="text-xs font-bold px-3 py-1 bg-purple-100 text-purple-800 rounded-full border border-purple-200">
                {user.subject}
              </span>
            )}
          </div>
          <p className="text-slate-600 mt-1">
            Create, edit, and track student group and individual assignment submissions.
          </p>
        </div>

        <Button variant="primary" onClick={openCreateModal} className="gap-2 self-start sm:self-auto">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Assignment
        </Button>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <Card className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800">No assignments created yet</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Click &quot;New Assignment&quot; above to post your first OneDrive task for students.
          </p>
          <div className="mt-5">
            <Button variant="primary" onClick={openCreateModal}>
              Create Assignment Now
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const totalAssigned = assignment.total_assigned_groups;
            const confirmed = assignment.confirmed_count;
            const pending = assignment.pending_count;
            const percent = totalAssigned > 0 ? Math.round((confirmed / totalAssigned) * 100) : 0;
            const mode = assignment.assign_mode || (assignment.assign_to_all ? 'all' : 'groups');

            return (
              <div
                key={assignment.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left: Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-bold text-lg text-slate-900 leading-snug">
                      {assignment.title}
                    </h3>
                    {mode === 'all' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        All Students ({totalAssigned} groups)
                      </span>
                    )}
                    {mode === 'groups' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        {assignment.assigned_group_ids?.length || 0} Target Group{(assignment.assigned_group_ids?.length || 0) === 1 ? '' : 's'}
                      </span>
                    )}
                    {mode === 'students' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        {assignment.assigned_student_ids?.length || 0} Individual Student{(assignment.assigned_student_ids?.length || 0) === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  {assignment.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {assignment.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <div>
                      <span className="font-semibold text-slate-700">Due:</span>{' '}
                      {formatDate(assignment.due_date)}
                    </div>
                    {assignment.onedrive_link && (
                      <a
                        href={assignment.onedrive_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        OneDrive Folder
                      </a>
                    )}
                  </div>
                </div>

                {/* Right: Progress and Action buttons */}
                <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center md:items-end lg:items-center gap-5 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {/* Mini Progress */}
                  <div className="w-full sm:w-44 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-emerald-700">{confirmed} Confirmed</span>
                      <span className="text-amber-700">{pending} Pending</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-right text-slate-400 font-medium">{percent}% complete</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link to={`/admin/assignments/${assignment.id}`} className="flex-1 sm:flex-none">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        View Tracking &rarr;
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(assignment)}
                      className="text-xs"
                      title="Edit Assignment"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-xl font-bold text-slate-900">
                {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
              </h2>
              <button
                onClick={closeFormModal}
                disabled={formSubmitting}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && <ErrorMessage message={formError} className="my-4 flex-shrink-0" onDismiss={() => setFormError('')} />}

            <form onSubmit={handleFormSubmit} className="space-y-4 pt-4 overflow-y-auto pr-1">
              <Input
                label="Assignment Title"
                id="assignmentTitle"
                placeholder="e.g. Midterm Project Proposal"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (fieldErrors.title) setFieldErrors({ ...fieldErrors, title: '' });
                }}
                error={fieldErrors.title}
                required
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Instructions for students regarding upload format, guidelines, and deliverables..."
                  className="block w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Due Date & Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => {
                      setFormData({ ...formData, due_date: e.target.value });
                      if (fieldErrors.due_date) setFieldErrors({ ...fieldErrors, due_date: '' });
                    }}
                    className={`block w-full px-3.5 py-2.5 rounded-xl border sm:text-sm shadow-sm ${
                      fieldErrors.due_date
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-brand-500'
                    }`}
                    required
                  />
                  {fieldErrors.due_date && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.due_date}</p>
                  )}
                </div>

                <Input
                  label="OneDrive Submission Link"
                  id="onedriveLink"
                  type="url"
                  placeholder="https://onedrive.live.com/..."
                  value={formData.onedrive_link}
                  onChange={(e) => {
                    setFormData({ ...formData, onedrive_link: e.target.value });
                    if (fieldErrors.onedrive_link) setFieldErrors({ ...fieldErrors, onedrive_link: '' });
                  }}
                  error={fieldErrors.onedrive_link}
                  required
                />
              </div>

              {/* Assignment Scope: 3 Options */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Assign To
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                      formData.assign_mode === 'all'
                        ? 'border-brand-600 bg-brand-50/50 text-brand-900 ring-1 ring-brand-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="assignScope"
                      checked={formData.assign_mode === 'all'}
                      onChange={() => setFormData({ ...formData, assign_mode: 'all' })}
                      className="text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                    <div className="text-xs">
                      <p className="font-bold">All Students</p>
                      <p className="text-slate-500 text-[11px]">All active groups</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                      formData.assign_mode === 'groups'
                        ? 'border-brand-600 bg-brand-50/50 text-brand-900 ring-1 ring-brand-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="assignScope"
                      checked={formData.assign_mode === 'groups'}
                      onChange={() => setFormData({ ...formData, assign_mode: 'groups' })}
                      className="text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                    <div className="text-xs">
                      <p className="font-bold">Specific Groups</p>
                      <p className="text-slate-500 text-[11px]">Pick target teams</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                      formData.assign_mode === 'students'
                        ? 'border-brand-600 bg-brand-50/50 text-brand-900 ring-1 ring-brand-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="assignScope"
                      checked={formData.assign_mode === 'students'}
                      onChange={() => setFormData({ ...formData, assign_mode: 'students' })}
                      className="text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                    <div className="text-xs">
                      <p className="font-bold">Specific Students</p>
                      <p className="text-slate-500 text-[11px]">Individual learners</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Checklist when Specific Groups is chosen */}
              {formData.assign_mode === 'groups' && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Select Target Groups:</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {formData.group_ids.length} selected
                    </span>
                  </div>

                  {fieldErrors.group_ids && (
                    <p className="text-xs text-rose-600 font-medium">{fieldErrors.group_ids}</p>
                  )}

                  {availableGroups.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">
                      No student groups have been created yet.
                    </p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pt-1 pr-1">
                      {availableGroups.map((g) => {
                        const checked = formData.group_ids.includes(g.id);
                        return (
                          <label
                            key={g.id}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              checked
                                ? 'bg-brand-50 border-brand-300 text-brand-950 font-medium'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleGroupSelection(g.id)}
                                className="rounded text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                              />
                              <span>{g.name}</span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {g.member_count} member{g.member_count === 1 ? '' : 's'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Searchable checklist when Specific Students is chosen */}
              {formData.assign_mode === 'students' && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Select Target Students:</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {formData.student_ids.length} selected
                    </span>
                  </div>

                  {/* Student Search */}
                  <input
                    type="text"
                    placeholder="Search students by name, email, or group..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="block w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-brand-500 focus:border-brand-500 bg-white shadow-sm"
                  />

                  {fieldErrors.student_ids && (
                    <p className="text-xs text-rose-600 font-medium">{fieldErrors.student_ids}</p>
                  )}

                  {filteredStudents.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">
                      No students found matching your search.
                    </p>
                  ) : (
                    <div className="max-h-44 overflow-y-auto space-y-1.5 pt-1 pr-1">
                      {filteredStudents.map((s) => {
                        const checked = formData.student_ids.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              checked
                                ? 'bg-brand-50 border-brand-300 text-brand-950 font-medium'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleStudentSelection(s.id)}
                                className="rounded text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                              />
                              <div>
                                <span className="font-semibold text-slate-900">{s.name}</span>
                                <span className="text-slate-400 text-[11px] ml-1.5">({s.email})</span>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                s.group_name
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              {s.group_name || 'No group'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 flex-shrink-0">
                <Button variant="outline" type="button" onClick={closeFormModal} disabled={formSubmitting}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={formSubmitting}>
                  {editingAssignment ? 'Save Changes' : 'Create Assignment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
