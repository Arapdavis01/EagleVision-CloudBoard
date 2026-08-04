import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Finance from './pages/Finance';
import Alerts from './pages/Alerts';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AlertProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="finance" element={<Finance />} />
              <Route path="alerts" element={<Alerts />} />
            </Route>
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1f2937', color: '#f3f4f6', border: '1px solid #374151' },
            }}
          />
        </AlertProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
