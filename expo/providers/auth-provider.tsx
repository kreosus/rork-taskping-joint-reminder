import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

export type { AuthProviderType, AppUser, StoredUserCandidate } from "@/lib/authUtils";
import type { AuthProviderType, AppUser, StoredUserCandidate } from "@/lib/authUtils";
import { isAuthProvider, normalizeIdentifier, isValidIdentifier, sanitizeUser } from "@/lib/authUtils";

interface AuthResult {
  ok: boolean;
  message?: string;
}

const USERS_KEY = "nudge.users.v1";
const SESSION_KEY = "nudge.session.v1";
const DEFAULT_USERS: AppUser[] = [
  {
    id: "demo_google_001",
    name: "Demo Google User",
    provider: "google",
    identifier: "demo@gmail.com",
    createdAt: 1710000000000,
  },
  {
    id: "demo_facebook_001",
    name: "Demo Facebook User",
    provider: "facebook",
    identifier: "demo@facebook.com",
    createdAt: 1710000000500,
  },
  {
    id: "demo_phone_001",
    name: "Demo Phone User",
    provider: "phone",
    identifier: "+15551234567",
    createdAt: 1710000001000,
  },
];

function providerLabel(provider: AuthProviderType): string {
  if (provider === "google") return "Google";
  if (provider === "facebook") return "Facebook";
  if (provider === "apple") return "Apple";
  return "phone";
}

function mergeDefaultUsers(stored: AppUser[]): AppUser[] {
  const merged = [...stored];
  DEFAULT_USERS.forEach((demo) => {
    const exists = merged.some((user) => user.provider === demo.provider && user.identifier === demo.identifier);
    if (!exists) merged.push(demo);
  });
  return merged;
}

async function loadUsers(): Promise<AppUser[]> {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    if (!raw) {
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_USERS;
    const sanitized = parsed.map((item) => sanitizeUser(item as StoredUserCandidate)).filter((user): user is AppUser => Boolean(user));
    const merged = mergeDefaultUsers(sanitized);
    if (merged.length !== sanitized.length) await AsyncStorage.setItem(USERS_KEY, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.log("[auth] load users error", e);
    return DEFAULT_USERS;
  }
}

async function loadSession(): Promise<AppUser | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredUserCandidate;
    return sanitizeUser(parsed);
  } catch (e) {
    console.log("[auth] load session error", e);
    return null;
  }
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const qc = useQueryClient();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [hydrated, setHydrated] = useState<boolean>(false);

  const usersQuery = useQuery({ queryKey: ["nudge", "users"], queryFn: loadUsers, staleTime: Infinity });
  const sessionQuery = useQuery({ queryKey: ["nudge", "session"], queryFn: loadSession, staleTime: Infinity });

  useEffect(() => {
    if (usersQuery.data) setUsers(usersQuery.data);
  }, [usersQuery.data]);

  useEffect(() => {
    if (sessionQuery.data !== undefined) setCurrentUser(sessionQuery.data);
  }, [sessionQuery.data]);

  useEffect(() => {
    if (usersQuery.isSuccess && sessionQuery.isSuccess && !hydrated) setHydrated(true);
  }, [usersQuery.isSuccess, sessionQuery.isSuccess, hydrated]);

  const persistUsersMutation = useMutation({
    mutationFn: async (next: AppUser[]) => {
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(next));
      return next;
    },
    onSuccess: (next) => qc.setQueryData(["nudge", "users"], next),
  });

  const persistSessionMutation = useMutation({
    mutationFn: async (next: AppUser | null) => {
      if (next) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
      else await AsyncStorage.removeItem(SESSION_KEY);
      return next;
    },
    onSuccess: (next) => qc.setQueryData(["nudge", "session"], next),
  });

  const signup = useCallback(
    async (provider: AuthProviderType, identifier: string, name: string): Promise<AuthResult> => {
      const normalized = normalizeIdentifier(provider, identifier);
      if (!normalized || !isValidIdentifier(provider, normalized)) return { ok: false, message: provider === "phone" ? "Enter a valid phone number with 10-15 digits." : "Enter a valid email address." };
      const latestUsers = users.length > 0 ? users : await loadUsers();
      const existing = latestUsers.find((u) => u.provider === provider && u.identifier === normalized);
      if (existing) {
        setCurrentUser(existing);
        await persistSessionMutation.mutateAsync(existing);
        return { ok: true, message: "Account already exists. Signed you in." };
      }
      const nextUser: AppUser = {
        id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim() || `${providerLabel(provider)} User`,
        provider,
        identifier: normalized,
        createdAt: Date.now(),
      };
      const nextUsers = [nextUser, ...latestUsers];
      setUsers(nextUsers);
      setCurrentUser(nextUser);
      await persistUsersMutation.mutateAsync(nextUsers);
      await persistSessionMutation.mutateAsync(nextUser);
      console.log("[auth] signup success", { provider, userId: nextUser.id });
      return { ok: true };
    },
    [users, persistUsersMutation, persistSessionMutation],
  );

  const login = useCallback(
    async (provider: AuthProviderType, identifier: string): Promise<AuthResult> => {
      const normalized = normalizeIdentifier(provider, identifier);
      if (!normalized || !isValidIdentifier(provider, normalized)) return { ok: false, message: provider === "phone" ? "Enter a valid phone number with 10-15 digits." : "Enter a valid email address." };
      const latestUsers = users.length > 0 ? users : await loadUsers();
      const existing = latestUsers.find((u) => u.provider === provider && u.identifier === normalized);
      if (!existing) return { ok: false, message: `No ${providerLabel(provider)} account found. Create one first.` };
      setUsers(latestUsers);
      setCurrentUser(existing);
      await persistSessionMutation.mutateAsync(existing);
      console.log("[auth] login success", { provider, userId: existing.id });
      return { ok: true };
    },
    [users, persistSessionMutation],
  );

  const signInWithApple = useCallback(
    async (appleUserId: string, email: string | null, fullName: string | null): Promise<AuthResult> => {
      const normalized = normalizeIdentifier("apple", appleUserId);
      if (!normalized) return { ok: false, message: "Apple did not return a valid account identifier." };
      const latestUsers = users.length > 0 ? users : await loadUsers();
      const existing = latestUsers.find((u) => u.provider === "apple" && u.identifier === normalized);
      if (existing) {
        setUsers(latestUsers);
        setCurrentUser(existing);
        await persistSessionMutation.mutateAsync(existing);
        console.log("[auth] apple login success", { userId: existing.id });
        return { ok: true };
      }
      const nextUser: AppUser = {
        id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: (fullName ?? "").trim() || (email ?? "").trim() || "Apple User",
        provider: "apple",
        identifier: normalized,
        createdAt: Date.now(),
      };
      const nextUsers = [nextUser, ...latestUsers];
      setUsers(nextUsers);
      setCurrentUser(nextUser);
      await persistUsersMutation.mutateAsync(nextUsers);
      await persistSessionMutation.mutateAsync(nextUser);
      console.log("[auth] apple signup success", { userId: nextUser.id });
      return { ok: true };
    },
    [users, persistUsersMutation, persistSessionMutation],
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    persistSessionMutation.mutate(null);
  }, [persistSessionMutation]);

  const deleteAccount = useCallback(async (): Promise<AuthResult> => {
    const target = currentUser;
    if (!target) return { ok: false, message: "No account is currently signed in." };
    const latestUsers = users.length > 0 ? users : await loadUsers();
    const remaining = latestUsers.filter((u) => u.id !== target.id);
    setUsers(remaining);
    setCurrentUser(null);
    await persistUsersMutation.mutateAsync(remaining);
    await persistSessionMutation.mutateAsync(null);
    console.log("[auth] account deleted", { userId: target.id });
    return { ok: true };
  }, [currentUser, users, persistUsersMutation, persistSessionMutation]);

  return useMemo(
    () => ({ users, currentUser, hydrated, isSignedIn: !!currentUser, signup, login, signInWithApple, logout, deleteAccount }),
    [users, currentUser, hydrated, signup, login, signInWithApple, logout, deleteAccount],
  );
});
