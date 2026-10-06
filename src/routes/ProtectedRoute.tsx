import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { FullScreenLoader } from "@/components/ui/FullScreenLoader";

export function ProtectedRoute() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;

  if (!user || !profile?.active || profile.id !== user.id) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
