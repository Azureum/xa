import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { fetchMe, setupBusiness } from "../api/auth";
import { supabase } from "../lib/supabaseClient";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsSessionLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setIsSessionLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const token = session?.access_token ?? null;

  const meQuery = useQuery({
    queryKey: ["me", token],
    queryFn: () => fetchMe(token as string),
    enabled: token !== null,
    retry: false,
  });

  const handleLogin = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message);
    }
  };

  const handleRegister = async (businessName: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      throw new Error(error.message);
    }

    const accessToken = data.session?.access_token;
    if (!accessToken) {
      throw new Error("Check your email to confirm your account, then log in.");
    }

    await setupBusiness(accessToken, businessName);
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isLoading = isSessionLoading || (token !== null && meQuery.isPending);

  return (
    <AuthContext.Provider
      value={{
        token,
        user: meQuery.data?.user ?? null,
        business: meQuery.data?.business ?? null,
        isLoading,
        isAuthenticated: token !== null && !meQuery.isError,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
