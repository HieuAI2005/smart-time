import { NavLink, useNavigate } from "react-router-dom";
import { CalendarDays, BarChart3, ListChecks, Moon, Sun, LogOut, Plus} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../lib/authStore";

export default function Navbar() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("ssp-theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("ssp-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("ssp-theme", "light");
    }
  }, [dark]);

  const user = useAuth((s) => s.currentUser);
  const signOut = useAuth((s) => s.signOut);
  const nav = useNavigate();

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `side-link ${isActive ? "active" : ""}`;

  const handleSignOut = () => {
    signOut();
    nav("/login");
  };

  const avatarText = useMemo(() => (user?.name?.[0] || "?").toUpperCase(), [user?.name]);

  const [openCard, setOpenCard] = useState(false);
  const avatarRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (!avatarRef.current || !cardRef.current) return;
      if (!avatarRef.current.contains(t) && !cardRef.current.contains(t)) {
        setOpenCard(false);
      }
    }
    if (openCard) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openCard]);

  return (
    <aside className="sidebar">
      <div className="side-brand">Study Planner</div>

      <nav className="side-nav">
        {!user ? (
          <>
            <NavLink to="/login" className={linkCls}>Sign in</NavLink>
            <NavLink to="/register" className={linkCls}>Create account</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/" end className={linkCls}>
              <ListChecks size={18} /><span>Do Now</span>
            </NavLink>
            <NavLink to="/calendar" className={linkCls}>
              <CalendarDays size={18} /><span>Calendar</span>
            </NavLink>
            <NavLink to="/analytics" className={linkCls}>
              <BarChart3 size={18} /><span>Analytics</span>
            </NavLink>
            <NavLink to="/add" className={linkCls}>
              <Plus size={18} /><span>Add Task</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="side-footer-row">
        {user && (
          <>
            <button
              ref={avatarRef}
              className="avatar-btn"
              onClick={() => setOpenCard((v) => !v)}
              aria-haspopup="dialog"
              aria-expanded={openCard}
              title={user.email}
            >
              <span className="avatar">{avatarText}</span>
            </button>

            <button
              className="icon-btn danger"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </>
        )}

        <button
          aria-label="Toggle theme"
          className="icon-btn"
          onClick={() => setDark((v) => !v)}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {user && openCard && (
        <div ref={cardRef} className="user-popover" role="dialog" aria-label="User info">
          <div className="user-popover-header">
            <span className="avatar lg">{avatarText}</span>
            <div>
              <div className="user-name">{user.name}</div>
              <div className="user-email">{user.email}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}