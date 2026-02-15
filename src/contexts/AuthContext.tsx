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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);

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

    // Process __lovable_token from OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const lovableToken = params.get('__lovable_token');

    if (lovableToken) {
      // Clean the URL immediately
      window.history.replaceState({}, '', window.location.pathname || '/');

      (async () => {
        try {
          const decoded = JSON.parse(atob(lovableToken));
          if (decoded.access_token && decoded.refresh_token) {
            await supabase.auth.setSession({
              access_token: decoded.access_token,
              refresh_token: decoded.refresh_token,
            });
            return; // onAuthStateChange will handle the rest
          }
        } catch (err) {
          console.error('[Auth] Failed to process OAuth token:', err);
        }
        // If we couldn't process it, just finish loading
        setLoading(false);
      })();
    } else {
      // Normal init — get existing session
      supabase.auth.getSession().then(({ data: { session: sess } }) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        setLoading(false);
      }).catch((err) => {
        console.error('[Auth] Failed to get session:', err);
        setLoading(false);
      });
    }

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
