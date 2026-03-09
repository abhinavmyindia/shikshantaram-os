import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AdminRole = 'owner' | 'admin' | 'manager' | 'operator' | null;

interface AdminRoleData {
  role: AdminRole;
  isOwner: boolean;
  displayName: string;
  loading: boolean;
}

export const canDo = {
  viewOverview:    (r: AdminRole) => r === 'owner' || r === 'admin',
  viewUsers:       (r: AdminRole) => r === 'owner' || r === 'admin' || r === 'manager',
  viewSignups:     (r: AdminRole) => r !== null,
  viewAnalytics:   (r: AdminRole) => r === 'owner',
  viewSecurity:    (r: AdminRole) => r === 'owner',
  viewTeam:        (r: AdminRole) => r === 'owner',
  approveSignups:  (r: AdminRole) => r !== null,
  editUsers:       (r: AdminRole) => r === 'owner' || r === 'admin' || r === 'manager',
  blockUsers:      (r: AdminRole) => r === 'owner' || r === 'admin',
  forceLogout:     (r: AdminRole) => r === 'owner',
  manageTeam:      (r: AdminRole) => r === 'owner',
  changeRole:      (r: AdminRole) => r === 'owner',
  deleteUsers:     (r: AdminRole) => r === 'owner' || r === 'admin',
};

export const roleMeta: Record<string, { label: string; bg: string; color: string }> = {
  owner:    { label: '👑 Owner',    bg: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white' },
  admin:    { label: '🔧 Admin',    bg: 'linear-gradient(135deg,#0369a1,#0284c7)', color: 'white' },
  manager:  { label: '📋 Manager',  bg: 'linear-gradient(135deg,#059669,#10b981)', color: 'white' },
  operator: { label: '⚡ Operator', bg: 'linear-gradient(135deg,#b45309,#d97706)', color: 'white' },
};

export const useAdminRole = (): AdminRoleData => {
  const [role, setRole] = useState<AdminRole>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data } = await supabase
          .from('admin_users')
          .select('role, is_owner, display_name, email')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setRole((data as any).role as AdminRole);
          setIsOwner((data as any).is_owner || false);
          setDisplayName((data as any).display_name || (data as any).email || user.email || '');
        }
      } catch (_) {}
      setLoading(false);
    };
    fetchRole();
  }, []);

  return { role, isOwner, displayName, loading };
};
