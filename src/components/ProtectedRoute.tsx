import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/authStore";

export default function ProtectedRoute() {
  const user = useAuth(s => s.currentUser);
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  return <Outlet />;
}