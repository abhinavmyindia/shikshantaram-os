import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  try {
    const { userId, userEmail, userAgent, sessionToken } = await req.json();

    if (!userId) throw new Error('userId required');

    // ─── OWNER BYPASS — check FIRST before anything else ─────────────────────
    const { data: ownerCheck } = await supabase
      .from('admin_users')
      .select('is_owner, role')
      .eq('user_id', userId)
      .eq('is_owner', true)
      .single();

    const isOwner = !!ownerCheck;

    // ─── UNAPPROVED USER CHECK — block anyone not in user_profiles ────────────
    if (!isOwner) {
      const { data: adminCheck } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      const isTeamMember = !!adminCheck;

      if (!isTeamMember) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, access_tier')
          .eq('id', userId)
          .single();

        if (!profile) {
          return new Response(JSON.stringify({
            allowed: false,
            reason: 'not_approved',
            message: 'Your account is pending approval. You will receive an email once approved. Please contact support if you need help.',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (profile.access_tier === 'revoked') {
          return new Response(JSON.stringify({
            allowed: false,
            reason: 'revoked',
            message: 'Your access has been revoked. Please contact support.',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
    }

    // ─── GET IP + GEO DATA ────────────────────────────────────────────────────
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || '0.0.0.0';

    let geoData: any = {};
    try {
      const isPublicIP = ipAddress !== '0.0.0.0'
        && !ipAddress.startsWith('192.')
        && !ipAddress.startsWith('127.')
        && !ipAddress.startsWith('10.')
        && !ipAddress.startsWith('172.');

      if (isPublicIP) {
        const geoRes = await fetch(
          `http://ip-api.com/json/${ipAddress}?fields=status,city,regionName,country,isp,org,timezone,lat,lon`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (geoRes.ok) geoData = await geoRes.json();
      }
    } catch (_) {}

    // ─── PARSE USER AGENT ─────────────────────────────────────────────────────
    const ua = userAgent || '';
    const isMobile = /Mobile|Android|iPhone/i.test(ua);
    const isTablet = /iPad|Tablet/i.test(ua);
    const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
    const browser = ua.includes('Edg/') ? 'Edge'
      : ua.includes('Chrome') ? 'Chrome'
      : ua.includes('Firefox') ? 'Firefox'
      : ua.includes('Safari') ? 'Safari' : 'Other';
    const os = ua.includes('Windows') ? 'Windows'
      : ua.includes('Macintosh') ? 'macOS'
      : ua.includes('Android') ? 'Android'
      : (ua.includes('iPhone') || ua.includes('iPad')) ? 'iOS'
      : ua.includes('Linux') ? 'Linux' : 'Other';

    const locationStr = `${geoData.city || ''}, ${geoData.regionName || ''}`.replace(/^, |, $/g, '').trim();

    // ─── OWNER GETS UNLIMITED ACCESS — skip all security checks ──────────────
    if (isOwner) {
      await supabase.from('login_sessions').insert({
        user_id: userId, user_email: userEmail, session_token: sessionToken,
        ip_address: ipAddress,
        ip_city: geoData.city || null, ip_state: geoData.regionName || null,
        ip_country: geoData.country || 'IN',
        ip_isp: geoData.isp || null, ip_org: geoData.org || null,
        ip_timezone: geoData.timezone || null,
        ip_lat: geoData.lat || null, ip_lon: geoData.lon || null,
        device_type: deviceType, browser, os,
        user_agent: ua.substring(0, 500), is_active: true,
      });

      return new Response(JSON.stringify({
        allowed: true, isOwner: true, sessionToken,
        location: locationStr || 'Unknown',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── REGULAR USER SECURITY CHECKS ────────────────────────────────────────

    const { data: secSettings } = await supabase
      .from('user_security_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (secSettings?.is_blocked) {
      await supabase.from('security_events').insert({
        user_id: userId, user_email: userEmail,
        event_type: 'blocked_login_attempt', severity: 'high',
        description: `Blocked user attempted login from ${ipAddress}`,
        ip_address: ipAddress, ip_location: locationStr,
        device_info: `${browser} on ${os}`,
        metadata: { reason: secSettings.block_reason },
      });

      return new Response(JSON.stringify({
        allowed: false, reason: 'blocked',
        message: secSettings.block_reason || 'Your account has been blocked. Please contact support.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check concurrent sessions
    const { data: activeSessions } = await supabase
      .from('login_sessions')
      .select('id, ip_address, session_token')
      .eq('user_id', userId)
      .eq('is_active', true);

    const maxConcurrent = secSettings?.max_concurrent_sessions ?? 1;
    const concurrentCount = activeSessions?.length ?? 0;

    if (concurrentCount >= maxConcurrent) {
      const sameIpSession = activeSessions?.find((s: any) => s.ip_address === ipAddress);
      if (!sameIpSession) {
        const newViolations = (secSettings?.violation_count ?? 0) + 1;
        const shouldAutoBlock = newViolations >= 3;

        await Promise.all([
          supabase.from('security_events').insert({
            user_id: userId, user_email: userEmail,
            event_type: 'concurrent_session_violation', severity: 'high',
            description: `Concurrent session violation — ${concurrentCount} active sessions`,
            ip_address: ipAddress, ip_location: locationStr,
            device_info: `${browser} on ${os} (${deviceType})`,
            metadata: { active_sessions: concurrentCount, max_allowed: maxConcurrent },
          }),
          supabase.from('user_security_settings').upsert({
            user_id: userId, user_email: userEmail,
            violation_count: newViolations,
            last_violation_at: new Date().toISOString(),
            is_blocked: shouldAutoBlock,
            block_reason: shouldAutoBlock ? 'Auto-blocked: Too many concurrent session violations' : undefined,
            blocked_at: shouldAutoBlock ? new Date().toISOString() : undefined,
          }, { onConflict: 'user_id' }),
        ]);

        return new Response(JSON.stringify({
          allowed: false, reason: 'concurrent_session',
          message: 'You are already logged in on another device. Please log out first, or contact support.',
          violation_count: newViolations,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Check unique IP limit (only last 30 days to prevent permanent lockout)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: ipHistory } = await supabase
      .from('login_sessions')
      .select('ip_address')
      .eq('user_id', userId)
      .neq('ip_address', ipAddress)
      .gte('created_at', thirtyDaysAgo);

    const uniqueIPs = [...new Set(ipHistory?.map((s: any) => s.ip_address) || [])];
    const maxIPs = secSettings?.max_unique_ips ?? 2;
    const isNewIP = !activeSessions?.find((s: any) => s.ip_address === ipAddress)
      && !uniqueIPs.includes(ipAddress);

    if (isNewIP && uniqueIPs.length >= maxIPs) {
      const newViolations = (secSettings?.violation_count ?? 0) + 1;
      await supabase.from('security_events').insert({
        user_id: userId, user_email: userEmail,
        event_type: 'ip_limit_exceeded', severity: 'high',
        description: `IP limit exceeded — tried to login from a new device`,
        ip_address: ipAddress, ip_location: locationStr,
        device_info: `${browser} on ${os}`,
        metadata: { known_ips: uniqueIPs, new_ip: ipAddress, max_allowed: maxIPs },
      });
      await supabase.from('user_security_settings').upsert({
        user_id: userId, user_email: userEmail,
        violation_count: newViolations,
        last_violation_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      return new Response(JSON.stringify({
        allowed: false, reason: 'ip_limit',
        message: 'Login from an unrecognized device. Maximum device limit reached. Contact support to add a new device.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── ALL CHECKS PASSED — Create session ──────────────────────────────────
    await supabase.from('login_sessions').insert({
      user_id: userId, user_email: userEmail, session_token: sessionToken,
      ip_address: ipAddress,
      ip_city: geoData.city || null, ip_state: geoData.regionName || null,
      ip_country: geoData.country || 'IN',
      ip_isp: geoData.isp || null, ip_org: geoData.org || null,
      ip_timezone: geoData.timezone || null,
      ip_lat: geoData.lat || null, ip_lon: geoData.lon || null,
      device_type: deviceType, browser, os,
      user_agent: ua.substring(0, 500), is_active: true,
    });

    if (isNewIP) {
      await supabase.from('security_events').insert({
        user_id: userId, user_email: userEmail,
        event_type: 'new_ip_detected', severity: 'low',
        description: 'User logged in from a new IP address',
        ip_address: ipAddress, ip_location: locationStr,
        device_info: `${browser} on ${os}`,
      });
    }

    await supabase.from('user_security_settings').upsert(
      { user_id: userId, user_email: userEmail },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );

    return new Response(JSON.stringify({
      allowed: true, sessionToken,
      location: locationStr || 'Unknown',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('log-session error:', err);
    return new Response(JSON.stringify({ allowed: true, error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
