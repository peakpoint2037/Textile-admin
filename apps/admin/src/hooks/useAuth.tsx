import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserDto } from '@textile-admin/shared';
import { apiClient, clearToken, getToken, setToken, setUnauthorizedHandler } from '@/api/client';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  user: UserDto | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  loginWithToken: (token: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = React.useState(() => Boolean(getToken()));

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get<UserDto>('/auth/me'),
    enabled: hasToken,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const logout = React.useCallback(async () => {
    try {
      if (getToken()) await apiClient.post('/auth/logout');
    } catch {
      // best-effort; we're clearing local state regardless
    }
    if (supabase) await supabase.auth.signOut();
    clearToken();
    setHasToken(false);
    queryClient.setQueryData(['auth', 'me'], null);
    queryClient.clear();
  }, [queryClient]);

  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setHasToken(false);
      queryClient.setQueryData(['auth', 'me'], null);
    });
  }, [queryClient]);

  const loginWithToken = React.useCallback(
    async (token: string) => {
      setToken(token);
      setHasToken(true);
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    [queryClient],
  );

  const loginWithPassword = React.useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error('Supabase is not configured');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error('No session returned from Supabase');
      await loginWithToken(accessToken);
    },
    [loginWithToken],
  );

  const status: AuthContextValue['status'] = !hasToken
    ? 'unauthenticated'
    : meQuery.isPending
      ? 'loading'
      : meQuery.data
        ? 'authenticated'
        : 'unauthenticated';

  const value: AuthContextValue = {
    user: meQuery.data ?? null,
    status,
    loginWithToken,
    loginWithPassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
