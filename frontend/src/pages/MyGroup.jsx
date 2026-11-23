import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';

export default function MyGroup() {
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [createName, setCreateName] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [addEmail, setAddEmail] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  const [removingId, setRemovingId] = useState(null);

  const fetchGroup = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/groups/mine');
      setGroup(res.data.group);
    } catch (err) {
      console.error('Failed to load group:', err);
      setError(err?.response?.data?.error || 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroup();
  }, []);

  // Auto-dismiss success message after 5 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!createName.trim() || createName.trim().length < 2) {
      setCreateError('Group name must be at least 2 characters');
      return;
    }

    setCreating(true);
    try {
      await api.post('/groups', { name: createName.trim() });
      setSuccessMsg('Group created successfully!');
      setCreateName('');
      await fetchGroup();
    } catch (err) {
      setCreateError(err?.response?.data?.error || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setAddError('');
    if (!addEmail.trim() || !/\S+@\S+\.\S+/.test(addEmail.trim())) {
      setAddError('Please enter a valid student email');
      return;
    }

    setAdding(true);
    try {
      await api.post(`/groups/${group.id}/members`, { email: addEmail.trim() });
      setSuccessMsg('Member added successfully!');
      setAddEmail('');
      await fetchGroup();
    } catch (err) {
      setAddError(err?.response?.data?.error || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (member) => {
    const isSelf = member.id === user.id;
    const confirmPrompt = isSelf
      ? 'Are you sure you want to leave this group? If you are the last member, the group will be deleted.'
      : `Are you sure you want to remove ${member.name} from the group?`;

    if (!window.confirm(confirmPrompt)) return;

    setRemovingId(member.id);
    setError('');
    try {
      await api.delete(`/groups/${group.id}/members/${member.id}`);
      setSuccessMsg(isSelf ? 'You have left the group.' : 'Member removed.');
      await fetchGroup();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="lg" text="Loading your group info..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          My Group
        </h1>
        <p className="text-slate-600 mt-1">
          Form your team, invite peers by email, and manage collaborative assignments.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg('')}
            className="text-emerald-600 hover:text-emerald-800 p-1 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* Case 1: Student is not in a group yet */}
      {!group ? (
        <Card className="max-w-xl mx-auto">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Create a New Group</h2>
            <p className="text-sm text-slate-600 mt-1">
              You are currently not part of any group. Start by naming your team.
            </p>
          </div>

          {createError && <ErrorMessage message={createError} className="mb-4" onDismiss={() => setCreateError('')} />}

          <form onSubmit={handleCreateGroup} className="space-y-4">
            <Input
              label="Group / Team Name"
              id="groupName"
              placeholder="e.g. Team Alpha"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              required
            />
            <Button
              type="submit"
              variant="primary"
              loading={creating}
              disabled={creating}
              className="w-full"
            >
              Create Group
            </Button>
          </form>
        </Card>
      ) : (
        /* Case 2: Student is in a group */
        <div className="space-y-6">
          {/* Group Overview Card */}
          <Card
            title={group.name}
            subtitle={`Created on ${new Date(group.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemoveMember({ id: user.id, name: user.name })}
                disabled={removingId === user.id}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              >
                {removingId === user.id ? 'Leaving...' : 'Leave Group'}
              </Button>
            }
          >
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Active Team
              </span>
              <span>•</span>
              <span>{group.members?.length || 0} Member{(group.members?.length || 0) === 1 ? '' : 's'}</span>
            </div>
          </Card>

          {/* Members List Card */}
          <Card
            title="Team Members"
            subtitle="Everyone in this group shares assignment visibility and submission status."
          >
            <div className="divide-y divide-slate-100">
              {group.members?.map((member) => {
                const isSelf = member.id === user.id;

                return (
                  <div
                    key={member.id}
                    className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                            {member.name}
                          </p>
                          {isSelf && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-50 text-brand-700 border border-brand-200 flex-shrink-0">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{member.email}</p>
                      </div>
                    </div>

                    <div>
                      {isSelf ? (
                        <button
                          onClick={() => handleRemoveMember(member)}
                          disabled={removingId === member.id}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800 p-1"
                        >
                          Leave
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRemoveMember(member)}
                          disabled={removingId === member.id}
                          className="text-xs font-semibold text-slate-400 hover:text-rose-600 p-1 transition-colors"
                          title="Remove member"
                        >
                          {removingId === member.id ? 'Removing...' : 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Add Member Card */}
          <Card
            title="Add Member to Group"
            subtitle="Enter the registered email address of a student to add them to your team."
          >
            {addError && <ErrorMessage message={addError} className="mb-4" onDismiss={() => setAddError('')} />}

            <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row items-end gap-3">
              <div className="w-full sm:flex-1">
                <Input
                  label="Student Email"
                  id="addEmail"
                  type="email"
                  placeholder="student@assiqo.dev"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                loading={adding}
                disabled={adding}
                className="w-full sm:w-auto"
              >
                Add Member
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
