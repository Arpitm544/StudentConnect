import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

// ✅ Route-level code splitting — each page is its own JS chunk
const Auth        = lazy(() => import('./Auth'));
const Profile     = lazy(() => import('./Profile'));
const TaskDetail  = lazy(() => import('./TaskDetail'));
const LandingPage = lazy(() => import('./LandingPage'));

// Minimal full-screen skeleton shown while a lazy chunk loads
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
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
  const { user, loading, refreshAuth, clearUser } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <ThemeProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Login Route */}
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

          {/* Signup Route */}
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

          {/* Dashboard & Profile Route */}
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
                        onLogout={() => {
                          clearUser();
                          navigate('/', { replace: true });
                        }}
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
    </ThemeProvider>
  );
}

export default App;

