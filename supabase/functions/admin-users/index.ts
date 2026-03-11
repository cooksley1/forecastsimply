import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Input validation helpers ---
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ['admin', 'moderator', 'user'];
const MAX_STRING = 500;
const MAX_META_SIZE = 4096;

function validateUUID(val: unknown, name: string): string {
  if (typeof val !== 'string' || !UUID_RE.test(val)) throw new Error(`Invalid ${name}: must be a valid UUID`);
  return val;
}

function validateEmail(val: unknown): string {
  if (typeof val !== 'string' || val.length > 255 || !EMAIL_RE.test(val)) throw new Error('Invalid email format');
  return val;
}

function validatePassword(val: unknown): string {
  if (typeof val !== 'string' || val.length < 8 || val.length > 128) throw new Error('Password must be 8-128 characters');
  return val;
}

function validatePhone(val: unknown): string {
  if (typeof val !== 'string' || val.length > 20 || !/^\+?[0-9\s\-()]+$/.test(val)) throw new Error('Invalid phone format');
  return val;
}

function validateRole(val: unknown): string {
  if (typeof val !== 'string' || !VALID_ROLES.includes(val)) throw new Error(`Invalid role: must be one of ${VALID_ROLES.join(', ')}`);
  return val;
}

function validateMetadata(val: unknown): Record<string, unknown> {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) throw new Error('user_metadata must be an object');
  if (JSON.stringify(val).length > MAX_META_SIZE) throw new Error(`user_metadata exceeds ${MAX_META_SIZE} bytes`);
  return val as Record<string, unknown>;
}

function validateDuration(val: unknown): number {
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0 || n > 87600) throw new Error('Duration must be 0-87600 hours');
  return n;
}

function validateString(val: unknown, name: string, max = MAX_STRING): string {
  if (typeof val !== 'string' || val.length > max) throw new Error(`${name} must be a string under ${max} chars`);
  return val;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing auth');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error('Unauthorized');

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const isAdminUser = async (userId: string): Promise<boolean> => {
      const { data, error } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      if (error) throw error;
      return !!data;
    };

    const assertNotAdminTarget = async (userId: string, action: string) => {
      if (await isAdminUser(userId)) {
        throw new Error(`Cannot ${action} an admin user.`);
      }
    };

    // Check admin role for caller
    if (!(await isAdminUser(caller.id))) throw new Error('Forbidden: admin role required');

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // LIST USERS
    if (req.method === 'GET' && action === 'list') {
      const page = Math.max(1, Math.min(100, parseInt(url.searchParams.get('page') || '1') || 1));
      const perPage = Math.max(1, Math.min(100, parseInt(url.searchParams.get('per_page') || '50') || 50));
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (error) throw error;

      const userIds = data.users.map(u => u.id);
      const { data: roles } = await adminClient.from('user_roles').select('*').in('user_id', userIds);
      const { data: profiles } = await adminClient.from('profiles').select('*').in('user_id', userIds);

      // Fetch last 5 logins per user
      const { data: logins } = await adminClient
        .from('login_history')
        .select('*')
        .in('user_id', userIds)
        .order('signed_in_at', { ascending: false })
        .limit(250);

      const loginsByUser: Record<string, any[]> = {};
      for (const l of (logins || [])) {
        if (!loginsByUser[l.user_id]) loginsByUser[l.user_id] = [];
        if (loginsByUser[l.user_id].length < 5) loginsByUser[l.user_id].push(l);
      }

      const enriched = data.users.map(u => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        banned_until: u.banned_until,
        user_metadata: u.user_metadata,
        role: roles?.find(r => r.user_id === u.id)?.role || 'user',
        profile: profiles?.find(p => p.user_id === u.id) || null,
        login_history: loginsByUser[u.id] || [],
      }));

      return new Response(JSON.stringify({ users: enriched, total: data.users.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST actions
    if (req.method === 'POST') {
      const body = await req.json();

      if (action === 'create') {
        const createData: any = { email_confirm: true };
        if (body.email) createData.email = validateEmail(body.email);
        if (body.password) createData.password = validatePassword(body.password);
        if (body.phone) createData.phone = validatePhone(body.phone);
        if (body.user_metadata) createData.user_metadata = validateMetadata(body.user_metadata);

        const { data, error } = await adminClient.auth.admin.createUser(createData);
        if (error) throw error;
        return new Response(JSON.stringify({ user: data.user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'update') {
        const user_id = validateUUID(body.user_id, 'user_id');
        const updateData: any = {};
        if (body.email) updateData.email = validateEmail(body.email);
        if (body.password) updateData.password = validatePassword(body.password);
        if (body.phone) updateData.phone = validatePhone(body.phone);
        if (body.user_metadata) updateData.user_metadata = validateMetadata(body.user_metadata);

        const { data, error } = await adminClient.auth.admin.updateUserById(user_id, updateData);
        if (error) throw error;
        return new Response(JSON.stringify({ user: data.user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'delete') {
        const user_id = validateUUID(body.user_id, 'user_id');
        const { error } = await adminClient.auth.admin.deleteUser(user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'ban') {
        const user_id = validateUUID(body.user_id, 'user_id');
        const duration = validateDuration(body.duration);

        // Prevent banning admin users
        if (duration > 0) {
          const { data: targetRole } = await adminClient
            .from('user_roles')
            .select('role')
            .eq('user_id', user_id)
            .eq('role', 'admin')
            .maybeSingle();
          if (targetRole) throw new Error('Cannot ban an admin user. Remove admin role first.');
        }

        const ban_duration = duration === 0 ? 'none' : `${duration}h`;
        const { data, error } = await adminClient.auth.admin.updateUserById(user_id, { ban_duration });
        if (error) throw error;

        if (duration > 0) {
          await adminClient.from('profiles').update({ banned_at: new Date().toISOString() }).eq('user_id', user_id);
        } else {
          await adminClient.from('profiles').update({ banned_at: null }).eq('user_id', user_id);
        }

        return new Response(JSON.stringify({ user: data.user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'set_role') {
        const user_id = validateUUID(body.user_id, 'user_id');
        const role = validateRole(body.role);
        const { error: delErr } = await adminClient.from('user_roles').delete().eq('user_id', user_id);
        if (delErr) throw delErr;
        const { error: insErr } = await adminClient.from('user_roles').insert({ user_id, role });
        if (insErr) throw insErr;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'impersonate') {
        const user_id = validateUUID(body.user_id, 'user_id');
        const { data: userData } = await adminClient.auth.admin.getUserById(user_id);
        if (!userData?.user?.email) throw new Error('User has no email');
        
        const { data, error } = await adminClient.auth.admin.generateLink({
          type: 'magiclink',
          email: userData.user.email,
        });
        if (error) throw error;

        return new Response(JSON.stringify({ 
          link: data.properties?.action_link,
          email: userData.user.email,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: err.message === 'Forbidden: admin role required' ? 403 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
