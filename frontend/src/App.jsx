import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, RoleRoute } from './components/RouteGuards';
import Layout from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import MyGroup from './pages/MyGroup';
import AdminDashboard from './pages/AdminDashboard';
import AdminAssignments from './pages/AdminAssignments';
import AdminAssignmentDetail from './pages/AdminAssignmentDetail';

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public authentication routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Authenticated routes with shared Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              {/* Student routes */}
              <Route element={<RoleRoute allowedRoles={['student']} />}>
                <Route path="/dashboard" element={<StudentDashboard />} />
                <Route path="/group" element={<MyGroup />} />
              </Route>

              {/* Admin routes */}
              <Route element={<RoleRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/assignments" element={<AdminAssignments />} />
                <Route path="/admin/assignments/:id" element={<AdminAssignmentDetail />} />
              </Route>
            </Route>
          </Route>

          {/* Root and fallback */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
