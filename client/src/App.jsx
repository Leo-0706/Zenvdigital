import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { ClientPortal } from './pages/ClientPortal';
import { Maintenance } from './pages/Maintenance';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsConditions } from './pages/TermsConditions';
import { CookiePreferences } from './pages/CookiePreferences';
import { RefundPolicy } from './pages/RefundPolicy';
import { NotFound } from './pages/NotFound';

const AppContent = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/admin') || location.pathname.startsWith('/portal');

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F6F0] text-[#1A2118]">
      {!isDashboard && <Navbar />}
      <div className="flex-1 flex flex-col">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-conditions" element={<TermsConditions />} />
          <Route path="/cookie-preferences" element={<CookiePreferences />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />

          {/* Admin Protected Console */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Client Protected Review Portal */}
          <Route
            path="/portal"
            element={
              <ProtectedRoute allowedRoles={['CLIENT', 'ADMIN']}>
                <ClientPortal />
              </ProtectedRoute>
            }
          />

          {/* Fallback & 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;
