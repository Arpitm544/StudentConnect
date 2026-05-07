import { Suspense, lazy, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

import ErrorBoundary from './components/ErrorBoundary.jsx';

const Auth        = lazy(() => import('./Auth'));
const Verify      = lazy(() => import('./Verify'));
const Profile     = lazy(() => import('./Profile'));
const TaskDetail  = lazy(() => import('./TaskDetail'));
const LandingPage = lazy(() => import('./LandingPage'));
import CommandPalette from './components/CommandPalette.jsx';

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-main">
      <div className="loader" />
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const navigate = useNavigate();
  const { user, loading, refreshAuth, logout } = useAuth();

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  if (loading) return <PageLoader />;

  return (
    <ThemeProvider>
      <CommandPalette onLogout={handleLogout} />
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
        <Routes>

          <Route path="/" element={<LandingPage />} />
  
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Auth onLoginSuccess={refreshAuth} initialIsLogin={true} />
              )
            }
          />
          <Route
            path="/signup"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Auth onLoginSuccess={refreshAuth} initialIsLogin={false} />
              )
            }
          />

          <Route
            path="/verify"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Verify onVerified={refreshAuth} />
              )
            }
          />

          <Route
            path="/dashboard/*"
            element={
              <RequireAuth>
                <Routes>
                  <Route path="task/:id" element={<TaskDetail />} />
                  <Route
                    path="/*"
                    element={
                      <Profile
                        onLogout={handleLogout}
                      />
                    }
                  />
                </Routes>
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;

