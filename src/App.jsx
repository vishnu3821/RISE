import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import SessionManager from './components/SessionManager';

import { Loader2 } from 'lucide-react';

// A component to automatically redirect logged in users based on their role
function AuthRedirectHandler({ fallback }) {
  const { user, role, loading } = useAuth();
  
  if (loading || (user && !role)) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center text-theme-text">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }
  
  if (user) {
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  return fallback || <Login />;
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-brand-bg text-white selection:bg-brand-primary/30 font-sans overflow-x-hidden">
            <SessionManager />
            <Routes>
              <Route path="/" element={<AuthRedirectHandler fallback={<Landing />} />} />

              <Route path="/login" element={<AuthRedirectHandler />} />
              <Route path="/signup" element={<Signup />} />

              <Route
                path="/dashboard/*"
                element={
                  <ProtectedRoute allowedRoles={['student', 'admin']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Admin />
                  </ProtectedRoute>
                }
              />

              {/* Catch all route - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
