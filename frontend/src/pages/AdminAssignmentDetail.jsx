import React from 'react';
import { useParams } from 'react-router-dom';

export default function AdminAssignmentDetail() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Assignment #{id} Tracking</h1>
        <p className="text-slate-600 mt-1">
          Group-wise and student-wise submission confirmation table.
        </p>
      </div>
    </div>
  );
}
