import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasAnyPermission } from '../utils/roles';
import { PageLoader } from './LoadingSpinner';

export default function RoleGuard({ permissions, children, redirectTo = '/login' }) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={redirectTo} replace />;
  if (permissions && !hasAnyPermission(user, ...permissions)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
