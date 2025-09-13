import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setCurrentUserId } from "./storage";
import { clearTasksInMemory, rehydrateTasks } from "./persistHelpers";

export type User = { id: string; email: string; name: string; };

type AuthState = {
  users: Array<User & { passwordHash: string }>;
  currentUser: User | null;
  signUp: (d: { email: string; name: string; password: string }) => string | null;
  signIn: (d: { email: string; password: string }) => string | null;
  signOut: () => void;
};

const weakHash = (s: string) => window.btoa(unescape(encodeURIComponent(s)));

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUser: null,

      signUp: ({ email, name, password }) => {
        email = email.trim().toLowerCase();
        name = name.trim();
        if (!email || !name || !password) return "Please fill all fields.";
        if (get().users.some((u) => u.email === email)) return "Email already registered.";

        const user: User & { passwordHash: string } = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          email,
          name,
          passwordHash: weakHash(password),
        };

        set({ users: [user, ...get().users], currentUser: { id: user.id, email, name } });

        setCurrentUserId(user.id);
        clearTasksInMemory();
        rehydrateTasks();

        return null;
      },

      signIn: ({ email, password }) => {
        email = email.trim().toLowerCase();
        const u = get().users.find((x) => x.email === email);
        if (!u) return "Account not found.";
        if (u.passwordHash !== weakHash(password)) return "Wrong password.";

        set({ currentUser: { id: u.id, email: u.email, name: u.name } });

        setCurrentUserId(u.id);
        clearTasksInMemory();
        rehydrateTasks();

        return null;
      },

      signOut: () => {
        set({ currentUser: null });
        setCurrentUserId("guest");
        clearTasksInMemory();
        rehydrateTasks();
      },
    }),
    { name: "ssp-auth" }
  )
);