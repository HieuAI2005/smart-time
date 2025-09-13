import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import DoNowView from "./views/DoNowView";
import CalendarView from "./views/CalendarView";
import AnalyticsView from "./views/AnalyticsView";
import LoginView from "./views/LoginView";
import RegisterView from "./views/RegisterView";
import ProtectedRoute from "./components/ProtectedRoute";
import AddTaskView from "./views/AddTaskView";

import Topbar from "./components/Topbar";
import Sidebar from "./components/Navbar";
import CompletionNotifier from "./views/CompletionNotifier";
import { useAuth } from "./lib/authStore";

export default function App() {
  const user = useAuth((s) => s.currentUser);
  const { pathname } = useLocation();

  const onAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  return (
    <>
      {!user || onAuthPage ? <Topbar /> : <Sidebar />}

      <main
        className={`${user && !onAuthPage ? "with-sidebar" : "container app-bg"}`}
        style={{ paddingTop: 16 }}
      >
        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route path="/register" element={<RegisterView />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DoNowView />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/analytics" element={<AnalyticsView />} />
            <Route path="/add" element={<AddTaskView />} />
          </Route>

          <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
        </Routes>
      </main>
      {user && !onAuthPage && <CompletionNotifier />}
    </>
  );
}
