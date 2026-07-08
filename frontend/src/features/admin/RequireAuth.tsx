import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null; // restaurando sesión — no flashear ni redirigir todavía
  if (!session) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
