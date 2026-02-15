import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error('Unauthorized');

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check admin role
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) throw new Error('Forbidden: admin role required');

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // LIST USERS
    if (req.method === 'GET' && action === 'list') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const perPage = parseInt(url.searchParams.get('per_page') || '50');
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (error) throw error;

      // Fetch roles and profiles for all users
      const userIds = data.users.map(u => u.id);
      const { data: roles } = await adminClient.from('user_roles').select('*').in('user_id', userIds);
      const { data: profiles } = await adminClient.from('profiles').select('*').in('user_id', userIds);

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
      }));

      return new Response(JSON.stringify({ users: enriched, total: data.users.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST actions
    if (req.method === 'POST') {
      const body = await req.json();

      if (action === 'create') {
        const { email, password, phone, user_metadata } = body;
        const createData: any = { email_confirm: true };
        if (email) createData.email = email;
        if (password) createData.password = password;
        if (phone) createData.phone = phone;
        if (user_metadata) createData.user_metadata = user_metadata;

        const { data, error } = await adminClient.auth.admin.createUser(createData);
        if (error) throw error;
        return new Response(JSON.stringify({ user: data.user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'update') {
        const { user_id, email, password, phone, user_metadata } = body;
        const updateData: any = {};
        if (email) updateData.email = email;
        if (password) updateData.password = password;
        if (phone) updateData.phone = phone;
        if (user_metadata) updateData.user_metadata = user_metadata;

        const { data, error } = await adminClient.auth.admin.updateUserById(user_id, updateData);
        if (error) throw error;
        return new Response(JSON.stringify({ user: data.user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'delete') {
        const { user_id } = body;
        const { error } = await adminClient.auth.admin.deleteUser(user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'ban') {
        const { user_id, duration } = body; // duration in hours, 0 = unban
        const ban_duration = duration === 0 ? 'none' : `${duration}h`;
        const { data, error } = await adminClient.auth.admin.updateUserById(user_id, { ban_duration });
        if (error) throw error;

        // Also update profiles.banned_at
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
        const { user_id, role } = body;
        // Upsert the role
        const { error: delErr } = await adminClient.from('user_roles').delete().eq('user_id', user_id);
        if (delErr) throw delErr;
        const { error: insErr } = await adminClient.from('user_roles').insert({ user_id, role });
        if (insErr) throw insErr;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'impersonate') {
        // Generate a magic link for the target user
        const { user_id } = body;
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
