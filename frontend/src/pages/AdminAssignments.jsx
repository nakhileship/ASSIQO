import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';

export default function AdminAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
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
    assign_to_all: true,
    group_ids: [],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [assnRes, grpRes] = await Promise.all([
        api.get('/admin/assignments'),
        api.get('/admin/groups'),
      ]);
      setAssignments(assnRes.data.assignments || []);
      setAvailableGroups(grpRes.data.groups || []);
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
    // Default due date: 7 days from now formatted for datetime-local (YYYY-MM-DDTHH:mm)
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const tzOffset = futureDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(futureDate.getTime() - tzOffset).toISOString().slice(0, 16);

    setFormData({
      title: '',
      description: '',
      due_date: localISOTime,
      onedrive_link: '',
      assign_to_all: true,
      group_ids: [],
    });
    setFormError('');
    setFieldErrors({});
    setIsFormOpen(true);
  };

  const openEditModal = (assignment) => {
    setEditingAssignment(assignment);

    // Format due_date for datetime-local input
    let formattedDue = '';
    if (assignment.due_date) {
      const d = new Date(assignment.due_date);
      const tzOffset = d.getTimezoneOffset() * 60000;
      formattedDue = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    }

    setFormData({
      title: assignment.title || '',
      description: assignment.description || '',
      due_date: formattedDue,
      onedrive_link: assignment.onedrive_link || '',
      assign_to_all: assignment.assign_to_all,
      group_ids: assignment.assigned_group_ids || [],
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

    if (!formData.assign_to_all && formData.group_ids.length === 0) {
      errors.group_ids = 'Please select at least one group';
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
        assign_to_all: formData.assign_to_all,
        group_ids: formData.assign_to_all ? [] : formData.group_ids,
      };

      if (editingAssignment) {
        await api.put(`/admin/assignments/${editingAssignment.id}`, payload);
        setToastMessage(`Assignment "${payload.title}" updated successfully!`);
      } else {
        await api.post('/admin/assignments', payload);
        setToastMessage(`Assignment "${payload.title}" created successfully!`);
      }

      setIsFormOpen(false);
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
      const updated = exists
        ? prev.group_ids.filter((id) => id !== groupId)
        : [...prev.group_ids, groupId];

      if (fieldErrors.group_ids && updated.length > 0) {
        setFieldErrors((f) => ({ ...f, group_ids: '' }));
      }

      return { ...prev, group_ids: updated };
    });
  };

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
      {/* Toast message */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="text-emerald-600 hover:text-emerald-800 p-1 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Assignments Management
          </h1>
          <p className="text-slate-600 mt-1">
            Create, edit, and track student group assignment submissions.
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
                    {assignment.assign_to_all ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        All Students ({totalAssigned} groups)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        {assignment.assigned_group_ids?.length || 0} Target Group{(assignment.assigned_group_ids?.length || 0) === 1 ? '' : 's'}
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

                {/* Middle: Mini Progress Bar */}
                <div className="w-full md:w-56 space-y-1.5 flex-shrink-0 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                    <span className="text-emerald-700 font-bold">{confirmed} confirmed</span>
                    <span className="text-amber-700">{pending} pending</span>
                  </div>
                  <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="text-right text-[11px] font-bold text-slate-400">
                    {percent}% completed
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2.5 flex-shrink-0 self-end md:self-center">
                  <Link to={`/admin/assignments/${assignment.id}`}>
                    <Button variant="outline" size="sm" className="gap-1.5 font-semibold">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openEditModal(assignment)}
                    className="gap-1.5 font-semibold"
                  >
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: New / Edit Assignment */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
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

            {formError && <ErrorMessage message={formError} className="my-4" onDismiss={() => setFormError('')} />}

            <form onSubmit={handleFormSubmit} className="space-y-4 pt-4">
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

              {/* Assignment Scope: Radio */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Assign To
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      formData.assign_to_all
                        ? 'border-brand-600 bg-brand-50/50 text-brand-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="assignScope"
                      checked={formData.assign_to_all}
                      onChange={() => setFormData({ ...formData, assign_to_all: true })}
                      className="text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                    <div className="text-xs">
                      <p className="font-bold">All Students</p>
                      <p className="text-slate-500">Visible to all active groups</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      !formData.assign_to_all
                        ? 'border-brand-600 bg-brand-50/50 text-brand-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="assignScope"
                      checked={!formData.assign_to_all}
                      onChange={() => setFormData({ ...formData, assign_to_all: false })}
                      className="text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                    <div className="text-xs">
                      <p className="font-bold">Specific Groups</p>
                      <p className="text-slate-500">Pick target teams</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Checklist when Specific Groups is chosen */}
              {!formData.assign_to_all && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
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
                      No student groups have been created yet. Students can form groups on the &quot;My Group&quot; page.
                    </p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                      {availableGroups.map((g) => {
                        const checked = formData.group_ids.includes(g.id);
                        return (
                          <label
                            key={g.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-white cursor-pointer text-xs pt-2"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleGroupSelection(g.id)}
                                className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4 border-slate-300"
                              />
                              <span className="font-semibold text-slate-800">{g.name}</span>
                            </div>
                            <span className="text-slate-400">
                              {g.member_count} member{g.member_count === 1 ? '' : 's'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Modal footer buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={closeFormModal} disabled={formSubmitting}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={formSubmitting} disabled={formSubmitting}>
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
