import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { FullScreenLoader } from "@/components/ui/FullScreenLoader";

export function AdminRoute() {
  const { isAdmin, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
}
