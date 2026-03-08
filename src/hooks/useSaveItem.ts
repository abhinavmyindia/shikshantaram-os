import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SaveItemParams {
  tool: string;
  item_type: string;
  title: string;
  summary?: string;
  full_data: any;
}

export function useSaveItem() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      setUserId(uid);
      supabase.from('saved_items').select('title, tool, item_type').eq('user_id', uid).then(({ data: items }) => {
        if (items) setSavedIds(new Set(items.map(i => `${i.tool}::${i.item_type}::${i.title}`)));
      });
    });
  }, []);

  const saveItem = useCallback(async (params: SaveItemParams) => {
    if (!userId) return;
    const key = `${params.tool}::${params.item_type}::${params.title}`;
    if (savedIds.has(key)) {
      // Unsave
      setSaving(key);
      const { error } = await supabase.from('saved_items').delete().eq('user_id', userId).eq('tool', params.tool).eq('item_type', params.item_type).eq('title', params.title);
      setSavedIds(prev => { const n = new Set(prev); n.delete(key); return n; });
      setSaving(null);
      if (error) {
        toast.error('Could not remove. Try again.', { duration: 3000 });
      } else {
        toast('Removed from saved', { duration: 1500 });
      }
      return;
    }
    setSaving(key);
    const { error } = await supabase.from('saved_items').insert({ user_id: userId, ...params });
    setSavedIds(prev => new Set(prev).add(key));
    setSaving(null);
    if (error) {
      toast.error('Could not save. Try again.', { duration: 3000 });
    } else {
      toast.success('🔖 Saved to My Saved!', { duration: 2000 });
    }
  }, [userId, savedIds]);

  const isSaved = useCallback((tool: string, item_type: string, title: string) => {
    return savedIds.has(`${tool}::${item_type}::${title}`);
  }, [savedIds]);

  const isSaving = useCallback((tool: string, item_type: string, title: string) => {
    return saving === `${tool}::${item_type}::${title}`;
  }, [saving]);

  return { saveItem, isSaved, isSaving, userId };
}
