
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { RouteCashPage } from './pages/RouteCash';
import { AgencyCashPage } from './pages/AgencyCash';
import { ClosingPage } from './pages/Closing';
import { Registries } from './pages/Registries';
import { ReportsPage } from './pages/Reports';
import { FuelPage } from './pages/Fuel';
import { GeneralExpensesPage } from './pages/GeneralExpenses';
import { TourismPage } from './pages/Tourism';
import { AuditPage } from './pages/Audit';
import { SystemEvolutionPage } from './pages/SystemEvolution';
import { DriverLedgerPage } from './pages/DriverLedger';
import { UsersPage } from './pages/Users';
import { LoginPage } from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastContainer } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { notificationService } from './services/notificationService';

// Override default alert
window.alert = (msg) => notificationService.warning(msg);

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
      
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/routes" element={<PrivateRoute><RouteCashPage /></PrivateRoute>} />
      <Route path="/agencies" element={<PrivateRoute><AgencyCashPage /></PrivateRoute>} />
      <Route path="/tourism" element={<PrivateRoute><TourismPage /></PrivateRoute>} />
      <Route path="/fuel" element={<PrivateRoute><FuelPage /></PrivateRoute>} />
      <Route path="/expenses" element={<PrivateRoute><GeneralExpensesPage /></PrivateRoute>} />
      <Route path="/closing" element={<PrivateRoute><ClosingPage /></PrivateRoute>} />
      <Route path="/registries" element={<PrivateRoute><Registries /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
      <Route path="/audit" element={<PrivateRoute><AuditPage /></PrivateRoute>} />
      <Route path="/evolution" element={<PrivateRoute><SystemEvolutionPage /></PrivateRoute>} />
      <Route path="/driver-ledger" element={<PrivateRoute><DriverLedgerPage /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute><UsersPage /></PrivateRoute>} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
        <AuthProvider>
            <HashRouter>
                <AppRoutes />
                <ToastContainer />
            </HashRouter>
        </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
