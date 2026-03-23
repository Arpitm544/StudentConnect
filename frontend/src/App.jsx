import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Auth from './Auth';
import Profile from './Profile';

function App() {
  const [user, setUser] = useState(false);
  const navigate = useNavigate();

  return (
    <Routes>
      {/* Root redirect */}
      <Route 
        path="/" 
        element={user ? <Navigate to="/profile" replace /> : <Navigate to="/login" replace />} 
      />
      
      {/* Login Route */}
      <Route 
        path="/login" 
        element={
          !user ? (
            <Auth 
              onLoginSuccess={() => {
                setUser(true);
                navigate('/profile', { replace: true });
              }} 
            />
          ) : (
            <Navigate to="/profile" replace />
          )
        } 
      />

      {/* Profile Route */}
      <Route 
        path="/profile" 
        element={
          user ? (
            <Profile 
              onLogout={() => { 
                setUser(false); 
                navigate('/login', { replace: true }); 
              }} 
            />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
    </Routes>
  );
}

export default App;
