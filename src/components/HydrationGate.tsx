import { useEffect } from "react";
import { useAuth } from "../lib/authStore";
import { setCurrentUserId } from "../lib/storage";
import { rehydrateTasks, clearTasksInMemory } from "../lib/persistHelpers";

export default function HydrationGate({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.currentUser);

  useEffect(() => {
    setCurrentUserId(user?.id ?? "guest");

    clearTasksInMemory();

    rehydrateTasks();
  }, [user?.id]);

  return <>{children}</>;
}
