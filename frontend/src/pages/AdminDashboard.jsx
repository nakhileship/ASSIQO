import React from 'react';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Overview of student groups, assignment submission metrics, and progress charts.
        </p>
      </div>
    </div>
  );
}
