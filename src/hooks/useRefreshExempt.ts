import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';

/**
 * Hook that checks if the current user is exempt from refresh limits.
 * Exempt if: admin, or email matches an excluded suffix configured by admins.
 */
export function useRefreshExempt() {
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck();
  const [suffixes, setSuffixes] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from('app_config')
      .select('value')
      .eq('key', 'excluded_email_suffixes')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) {
          setSuffixes((data.value as any[]).map(String));
        }
        setLoaded(true);
      });
  }, []);

  const isExempt = isAdmin || (
    loaded && user?.email
      ? suffixes.some(s => user.email!.toLowerCase().endsWith(s.toLowerCase()))
      : false
  );

  return { isExempt, loaded };
}
