import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';

export default function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/groups');
      setGroups(res.data.groups || []);
    } catch (err) {
      console.error('Failed to load groups:', err);
      setError(err?.response?.data?.error || 'Failed to load groups list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredGroups = groups.filter((g) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      g.name.toLowerCase().includes(q) ||
      (g.members &&
        g.members.some(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q)
        ))
    );
  });

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="lg" text="Loading student groups..." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Student Groups
          </h1>
          <p className="text-slate-600 mt-1">
            Overview of all active student teams, their roster, and member emails.
          </p>
        </div>

        {/* Search */}
        <div className="relative self-start sm:self-auto">
          <input
            type="text"
            placeholder="Search groups or members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-brand-500 focus:border-brand-500 bg-white shadow-sm w-64 sm:w-72"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <Card className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            {searchQuery ? 'No matching groups found' : 'No student groups formed yet'}
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Try searching with a different team or student name.'
              : 'When students create and join groups on the "My Group" page, they will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => {
            const memberCount = group.members?.length || group.member_count || 0;
            return (
              <div
                key={group.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Group Name & Member count */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-bold text-lg text-slate-900 leading-snug">
                      {group.name}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 flex-shrink-0">
                      {memberCount} member{memberCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-4">
                    Formed on {formatDate(group.created_at)}
                  </p>

                  {/* Members list */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Team Members
                    </p>
                    {group.members && group.members.length > 0 ? (
                      <div className="space-y-2">
                        {group.members.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100"
                          >
                            <div className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {m.name}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">{m.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No active members in this group.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
