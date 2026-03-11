import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { clearAllCache } from '@/services/cache';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Always set up auth state listener
  useEffect(() => {
    const applySession = (sess: Session | null) => {
      setSession(sess);
      setUser(sess?.user ?? null);
    };

    const decodeBase64Url = (value: string) => {
      const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
      const pad = normalized.length % 4;
      const padded = pad ? normalized + '='.repeat(4 - pad) : normalized;
      return atob(padded);
    };

    const extractTokensFromLovableToken = (token: string): { access_token: string; refresh_token: string } | null => {
      try {
        // case 1: token is base64url(JSON)
        const maybeJson = JSON.parse(decodeBase64Url(token));
        if (maybeJson?.access_token && maybeJson?.refresh_token) {
          return { access_token: maybeJson.access_token, refresh_token: maybeJson.refresh_token };
        }
      } catch {
        // ignore
      }

      try {
        // case 2: token is JWT with tokens in payload
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(decodeBase64Url(parts[1]));
          if (payload?.access_token && payload?.refresh_token) {
            return { access_token: payload.access_token, refresh_token: payload.refresh_token };
          }
        }
      } catch {
        // ignore
      }

      return null;
    };

    const cleanAuthParamsFromUrl = () => {
      const url = new URL(window.location.href);
      [
        '__lovable_token', 'access_token', 'refresh_token', 'expires_at', 'expires_in',
        'token_type', 'provider_token', 'provider_refresh_token', 'code', 'state',
      ].forEach((k) => url.searchParams.delete(k));

      if (/access_token|refresh_token|error=|type=/.test(url.hash)) {
        url.hash = '';
      }

      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}` || '/');
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      applySession(sess);
      if (event !== 'INITIAL_SESSION') setLoading(false);

      // Clear all caches when user signs in so they get fresh data
      if (event === 'SIGNED_IN') {
        clearAllCache();
        queryClient.invalidateQueries();
        console.log('[Auth] Signed in — all data caches cleared');

        // Track login history
        if (sess?.user) {
          supabase.from('login_history').insert({
            user_id: sess.user.id,
            user_agent: navigator.userAgent,
          } as any).then(({ error }) => {
            if (error) console.warn('[Auth] Failed to log sign-in:', error.message);
          });
        }
      }
    });

    const initAuth = async () => {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
        const queryParams = url.searchParams;

        const access_token = hashParams.get('access_token') || queryParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const lovableToken = queryParams.get('__lovable_token');

        // 1) OAuth token fragments (mobile Safari/Chrome redirect flows)
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          cleanAuthParamsFromUrl();
        }

        // 2) Lovable OAuth token envelope
        if (!access_token && !refresh_token && lovableToken) {
          const tokenPair = extractTokensFromLovableToken(lovableToken);
          if (tokenPair) {
            await supabase.auth.setSession(tokenPair);
          }
          cleanAuthParamsFromUrl();
        }

        // 3) Final session restore (with brief retry for mobile redirect timing)
        let sess: Session | null = null;
        for (let i = 0; i < 3; i++) {
          const { data } = await supabase.auth.getSession();
          sess = data.session;
          if (sess) break;
          await new Promise((r) => setTimeout(r, 250));
        }

        applySession(sess);
      } catch (err) {
        console.error('[Auth] Failed to initialize session:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signInWithPhone = useCallback(async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { lovable } = await import('@/integrations/lovable');
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result && 'error' in result && result.error) {
        console.error('[Auth] Google sign-in error:', result.error);
      }
    } catch (err) {
      console.error('[Auth] Google sign-in exception:', err);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/welcome';
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithEmail, signUpWithEmail, signInWithPhone, verifyOtp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
