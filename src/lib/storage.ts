import localforage from "localforage";
import { type StateStorage, createJSONStorage } from "zustand/middleware";

const SESSION_KEY = "ssp/currentUserId";

const getBootUserId = (): string => {
  if (typeof window === "undefined") return "guest";
  return sessionStorage.getItem(SESSION_KEY) || "guest";
};

let currentUserId = getBootUserId();

export const setCurrentUserId = (uid: string): string => {
  currentUserId = uid || "guest";
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SESSION_KEY, currentUserId);
  }
  return currentUserId;
};

export const getCurrentUserId = (): string => currentUserId;

const lfCache = new Map<string, LocalForage>();
const getLF = () => {
  const key = `ssp-store:${currentUserId}`;
  const cached = lfCache.get(key);
  if (cached) return cached;
  const inst = localforage.createInstance({ name: key });
  lfCache.set(key, inst);
  return inst;
};

export const clearCurrentUserStorage = async () => {
  await getLF().clear();
};

export const perUserIndexedDBStorage: StateStorage = {
  async getItem(name) {
    return (await getLF().getItem<string>(name)) ?? null;
  },
  async setItem(name, value) {
    await getLF().setItem(name, value);
  },
  async removeItem(name) {
    await getLF().removeItem(name);
  },
};

export const perUserJSONStorage = createJSONStorage(() => perUserIndexedDBStorage);
