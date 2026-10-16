import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';

import { StudentLayout } from './layouts/StudentLayout.jsx';
import { AdminLayout } from './layouts/AdminLayout.jsx';

import { LoginPage } from './pages/auth/LoginPage.jsx';
import { RegisterPage } from './pages/auth/RegisterPage.jsx';

import { StudentDashboard } from './pages/student/StudentDashboard.jsx';
import { CourseCatalogPage } from './pages/student/CourseCatalogPage.jsx';
import { MyRegistrationsPage } from './pages/student/MyRegistrationsPage.jsx';
import { TimetablePage } from './pages/student/TimetablePage.jsx';
import { AcademicPlannerPage } from './pages/student/AcademicPlannerPage.jsx';
import { NotificationsPage } from './pages/student/NotificationsPage.jsx';
import { ProfilePage } from './pages/student/ProfilePage.jsx';

import { AdminDashboard } from './pages/admin/AdminDashboard.jsx';
import { ManageCoursesPage } from './pages/admin/ManageCoursesPage.jsx';
import { ManageSectionsPage } from './pages/admin/ManageSectionsPage.jsx';
import { AdminEnrollmentsPage } from './pages/admin/AdminEnrollmentsPage.jsx';
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage.jsx';
import { AdminRulesPage } from './pages/admin/AdminRulesPage.jsx';

import { Spinner } from './components/common/Spinner.jsx';

// Route Guard for authenticated users
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  }

  return children;
};

// Root index redirector based on authentication state and role
const HomeRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
};

export const App = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Student Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="catalog" element={<CourseCatalogPage />} />
              <Route path="registrations" element={<MyRegistrationsPage />} />
              <Route path="timetable" element={<TimetablePage />} />
              <Route path="planner" element={<AcademicPlannerPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Administrator Protected Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="courses" element={<ManageCoursesPage />} />
              <Route path="sections" element={<ManageSectionsPage />} />
              <Route path="enrollments" element={<AdminEnrollmentsPage />} />
              <Route path="students" element={<AdminStudentsPage />} />
              <Route path="rules" element={<AdminRulesPage />} />
            </Route>

            {/* Default Catch-all */}
            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
