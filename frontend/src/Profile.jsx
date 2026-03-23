import React from 'react';

export default function Profile({onLogout }) {
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      onLogout();
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <div className="profile-container">
      <h2 className="greeting">Welcome! Something coming soon...</h2>
      <button onClick={handleLogout} className="btn btn-secondary" style={{ marginTop: "20px" }}>
        Sign Out
      </button>
    </div>
  );
}
