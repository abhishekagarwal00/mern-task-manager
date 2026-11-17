import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <p className="center-note">Loading…</p>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Auth mode="login" />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Auth mode="register" />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
