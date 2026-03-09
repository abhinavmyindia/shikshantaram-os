import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { userId, userEmail, userAgent, sessionToken } = await req.json();

    // 1. Get IP from request headers
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || '0.0.0.0';

    // 2. Geo-lookup the IP
    let geoData: any = {};
    try {
      if (ipAddress !== '0.0.0.0' && !ipAddress.startsWith('192.') && !ipAddress.startsWith('127.')) {
        const geoRes = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,city,regionName,country,isp,org,timezone,lat,lon`);
        geoData = await geoRes.json();
      }
    } catch (_) {}

    // 3. Parse user agent
    const ua = userAgent || '';
    const isMobile = /Mobile|Android|iPhone/i.test(ua);
    const isTablet = /iPad|Tablet/i.test(ua);
    const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
    const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : ua.includes('Edge') ? 'Edge' : 'Other';
    const os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Android') ? 'Android' : (ua.includes('iPhone') || ua.includes('iPad')) ? 'iOS' : ua.includes('Linux') ? 'Linux' : 'Other';

    // 4. Check user security settings
    const { data: secSettings } = await supabase
      .from('user_security_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    const locationStr = `${geoData.city || ''}, ${geoData.regionName || ''}, ${geoData.country || ''}`.replace(/^, |, $/g, '').trim();

    // If user is blocked
    if (secSettings?.is_blocked) {
      await supabase.from('security_events').insert({
        user_id: userId, user_email: userEmail,
        event_type: 'blocked_login_attempt', severity: 'high',
        description: `Blocked user attempted to login from ${ipAddress}`,
        ip_address: ipAddress, ip_location: locationStr,
        device_info: `${browser} on ${os} (${deviceType})`,
        metadata: { reason: secSettings.block_reason },
      });
      return new Response(JSON.stringify({
        allowed: false, reason: 'blocked',
        message: secSettings.block_reason || 'Your account has been blocked. Please contact support.'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 5. Count active concurrent sessions
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
        await supabase.from('security_events').insert({
          user_id: userId, user_email: userEmail,
          event_type: 'concurrent_session_violation', severity: 'high',
          description: `User tried to login from new IP while ${concurrentCount} session(s) active`,
          ip_address: ipAddress, ip_location: locationStr,
          device_info: `${browser} on ${os} (${deviceType})`,
          metadata: { active_sessions: concurrentCount, max_allowed: maxConcurrent },
        });

        const newViolations = (secSettings?.violation_count ?? 0) + 1;
        const shouldAutoBlock = newViolations >= 3;

        await supabase.from('user_security_settings').upsert({
          user_id: userId, user_email: userEmail,
          violation_count: newViolations,
          last_violation_at: new Date().toISOString(),
          is_blocked: shouldAutoBlock,
          block_reason: shouldAutoBlock ? 'Auto-blocked: Too many concurrent session violations' : undefined,
          blocked_at: shouldAutoBlock ? new Date().toISOString() : undefined,
        }, { onConflict: 'user_id' });

        return new Response(JSON.stringify({
          allowed: false, reason: 'concurrent_session',
          message: 'You are already logged in on another device. Please log out from your other device first, or contact support if this is an error.',
          active_sessions: concurrentCount, violation_count: newViolations,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // 6. Check unique IP limit
    const { data: ipHistory } = await supabase
      .from('login_sessions')
      .select('ip_address')
      .eq('user_id', userId)
      .neq('ip_address', ipAddress);

    const uniqueIPs = [...new Set(ipHistory?.map((s: any) => s.ip_address) || [])];
    const maxIPs = secSettings?.max_unique_ips ?? 2;
    const isNewIP = !activeSessions?.find((s: any) => s.ip_address === ipAddress) && !uniqueIPs.includes(ipAddress);

    if (isNewIP && uniqueIPs.length >= maxIPs) {
      await supabase.from('security_events').insert({
        user_id: userId, user_email: userEmail,
        event_type: 'ip_limit_exceeded', severity: 'high',
        description: `User tried to login from a ${uniqueIPs.length + 1}th IP (limit: ${maxIPs})`,
        ip_address: ipAddress, ip_location: locationStr,
        device_info: `${browser} on ${os} (${deviceType})`,
        metadata: { known_ips: uniqueIPs, new_ip: ipAddress, max_allowed: maxIPs },
      });

      const newViolations = (secSettings?.violation_count ?? 0) + 1;
      await supabase.from('user_security_settings').upsert({
        user_id: userId, user_email: userEmail,
        violation_count: newViolations,
        last_violation_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      return new Response(JSON.stringify({
        allowed: false, reason: 'ip_limit',
        message: 'Login attempted from an unrecognized device. Maximum device limit reached. Please contact support to add a new device.',
        known_ips: uniqueIPs.length, max_ips: maxIPs,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 7. All checks passed — create the session
    await supabase.from('login_sessions').insert({
      user_id: userId, user_email: userEmail,
      session_token: sessionToken,
      ip_address: ipAddress,
      ip_city: geoData.city || null, ip_state: geoData.regionName || null,
      ip_country: geoData.country || 'IN',
      ip_isp: geoData.isp || null, ip_org: geoData.org || null,
      ip_timezone: geoData.timezone || null,
      ip_lat: geoData.lat || null, ip_lon: geoData.lon || null,
      device_type: deviceType, browser, os,
      user_agent: ua.substring(0, 500),
      is_active: true,
    });

    if (isNewIP) {
      await supabase.from('security_events').insert({
        user_id: userId, user_email: userEmail,
        event_type: 'new_ip_detected', severity: 'low',
        description: 'User logged in from a new IP address',
        ip_address: ipAddress, ip_location: locationStr,
        device_info: `${browser} on ${os} (${deviceType})`,
      });
    }

    // Ensure security settings row exists
    await supabase.from('user_security_settings').upsert({
      user_id: userId, user_email: userEmail,
    }, { onConflict: 'user_id', ignoreDuplicates: true });

    return new Response(JSON.stringify({
      allowed: true, sessionToken,
      location: locationStr || 'Unknown',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('log-session error:', err);
    return new Response(JSON.stringify({ allowed: true, error: (err as Error).message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
