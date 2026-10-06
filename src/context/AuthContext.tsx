import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { ProfileRow } from "@/types/database.types";
import { queryClient } from "@/lib/queryClient";

interface AuthContextValue {
  user: User | null;
  profile: ProfileRow | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  canEditReservations: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        if (!nextSession) {
          setProfile(null);
          setLoading(false);
        }
      },
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let active = true;
    setLoading(true);
    const userId = session.user.id;
    async function refreshProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (!active) return;
      const nextProfile = error ? null : (data as ProfileRow);
      setProfile(nextProfile);
      setLoading(false);
      if (!nextProfile?.active) {
        queryClient.clear();
        await supabase.auth.signOut();
      }
    }
    void refreshProfile();
    const interval = window.setInterval(() => void refreshProfile(), 30_000);
    const onFocus = () => void refreshProfile();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [session?.user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      profile,
      session,
      loading,
      isAdmin: profile?.active === true && profile.role === "admin",
      canEditReservations:
        profile?.active === true &&
        (profile.role === "admin" ||
          profile.permissions?.can_edit_reservations === true),
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
        queryClient.clear();
      },
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
