import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { can, type Role } from '@/lib/permissions';

export function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Carregando sessão...</div>;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

export function RequireRole({ resource, action }: { resource: Parameters<typeof can>[2]; action: Parameters<typeof can>[1] }) {
  const { profile } = useAuth();
  const role = profile?.role as Role | undefined;

  if (!can(role, action, resource)) {
    return <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Sem permissão para acessar este módulo.</div>;
  }

  return <Outlet />;
}
