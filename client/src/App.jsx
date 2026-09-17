import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { FiltersProvider } from './context/FiltersContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetail from './pages/Users/UserDetail';
import Sessions from './pages/Sessions';
import Events from './pages/Events';
import Screens from './pages/Screens';
// HIDDEN: pages backed by synthetic data — see the commented routes below.
// import ScreenUsage from './pages/ScreenUsage';
// import ModuleUsage from './pages/ModuleUsage';
// import WorkflowBreak from './pages/WorkflowBreak';
import RoleUsage from './pages/RoleUsage';
import RoleAnalytics from './pages/RoleAnalytics';
import DealerAnalytics from './pages/DealerAnalytics';
import FeatureUsage from './pages/FeatureUsage';
import Realtime from './pages/Realtime';
import Retention from './pages/Retention';
import Reports from './pages/Reports';
import { ROUTES } from './constants/routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedDashboard = () => (
  <ProtectedRoute>
    <DashboardLayout>
      <Routes>
        <Route path={ROUTES.DASHBOARD}   element={<Dashboard />} />
        <Route path={ROUTES.USERS}        element={<Users />} />
        <Route path={ROUTES.USER_DETAIL}  element={<UserDetail />} />
        <Route path={ROUTES.SESSIONS}     element={<Sessions />} />
        <Route path={ROUTES.EVENTS}       element={<Events />} />
        <Route path={ROUTES.SCREENS}      element={<Screens />} />
        {/* HIDDEN: usageService.js fabricates all of these numbers (no DB reads).
            The catch-all below redirects these paths to the dashboard. */}
        {/* <Route path={ROUTES.SCREEN_USAGE}   element={<ScreenUsage />} /> */}
        {/* <Route path={ROUTES.MODULE_USAGE}   element={<ModuleUsage />} /> */}
        {/* <Route path={ROUTES.WORKFLOW_BREAK} element={<WorkflowBreak />} /> */}
        <Route path={ROUTES.ROLE_USAGE}     element={<RoleUsage />} />
        <Route path={ROUTES.ROLE_ANALYTICS} element={<RoleAnalytics />} />
        <Route path={ROUTES.DEALER_ANALYTICS} element={<DealerAnalytics />} />
        <Route path={ROUTES.FEATURE_USAGE}       element={<FeatureUsage />} />
        <Route path={ROUTES.REALTIME}     element={<Realtime />} />
        <Route path={ROUTES.RETENTION}    element={<Retention />} />
        <Route path={ROUTES.REPORTS}      element={<Reports />} />
        <Route path="*"                   element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </DashboardLayout>
  </ProtectedRoute>
);

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path="/*" element={<ProtectedDashboard />} />
    </Routes>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <FiltersProvider>
          <AppRoutes />
        </FiltersProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
