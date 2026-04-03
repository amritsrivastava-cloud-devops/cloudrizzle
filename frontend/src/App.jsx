import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import api from './utils/api';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import CloudAccountsPage from './pages/CloudAccountsPage';
import MonitoringPage from './pages/MonitoringPage';
import DeployPage from './pages/DeployPage';
import AIAssistantPage from './pages/AIAssistantPage';
import SettingsPage from './pages/SettingsPage';
import TemplatesPage from './pages/TemplatesPage';

// Layout
import AppShell from './components/layout/AppShell';
import NotificationToast from './components/layout/NotificationToast';

import './index.css';

const ProtectedRoute = ({ children }) => {
  const { accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const { accessToken, setToken } = useAuthStore();

  useEffect(() => {
    if (accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    }
  }, [accessToken]);

  return (
    <BrowserRouter>
      <NotificationToast />
      <Routes>
        <Route path="/login" element={
          accessToken ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="cloud" element={<CloudAccountsPage />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="deploy" element={<DeployPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="ai" element={<AIAssistantPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
