
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

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/routes" element={<RouteCashPage />} />
          <Route path="/agencies" element={<AgencyCashPage />} />
          <Route path="/tourism" element={<TourismPage />} />
          <Route path="/fuel" element={<FuelPage />} />
          <Route path="/expenses" element={<GeneralExpensesPage />} />
          <Route path="/closing" element={<ClosingPage />} />
          <Route path="/registries" element={<Registries />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
