// src/routes/ProtectedRoute.jsx
import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute({ roles }) {
  const token = useSelector((s) => s.auth.token);
  const user  = useSelector((s) => s.auth.user);
  const loc = useLocation();

  // Chưa đăng nhập → về /login, nhớ đường dẫn để quay lại sau
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  // Có role yêu cầu nhưng không khớp → 403
  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />; // render children routes
}
