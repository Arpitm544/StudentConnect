import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Auth from './Auth';
import Profile from './Profile';
import TaskDetail from './TaskDetail';
import LandingPage from './LandingPage';
import { useAuth } from './context/AuthContext.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const navigate = useNavigate();
  const { user, loading, refreshAuth, clearUser } = useAuth();

  if (loading) return null;

  return (
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
              <Route path="/*" element={
                <Profile
                  onLogout={() => {
                    clearUser();
                    navigate('/', { replace: true });
                  }}
                />
              } />
            </Routes>
          </RequireAuth>
        } 
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
