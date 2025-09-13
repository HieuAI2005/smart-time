import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/authStore";

export default function Topbar() {
  const user = useAuth((s) => s.currentUser);

  return (
    <header className="header">
      <div className="navbar container" style={{ padding: "12px 16px" }}>
        <div className="brand">Smart Study Planner</div>
        <nav className="nav">
          {!user && (
            <>
              <NavLink to="/login" className="nav-link">
                Sign in
              </NavLink>
              <NavLink to="/register" className="nav-link">
                Create account
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}