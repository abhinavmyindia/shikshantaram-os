import { supabase } from '@/integrations/supabase/client';

// Fire-and-forget after every AI generation. Never blocks UI.
export const autoSaveWork = async ({
  userId,
  tool,
  callType,
  title,
  subtitle,
  inputData,
  outputData,
}: {
  userId: string;
  tool: string;
  callType: string;
  title: string;
  subtitle?: string;
  inputData: Record<string, any>;
  outputData: Record<string, any>;
}): Promise<void> => {
  try {
    const { data: existing } = await supabase
      .from('recent_work')
      .select('id')
      .eq('user_id', userId)
      .eq('tool', tool)
      .eq('call_type', callType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const payload = {
      user_id: userId,
      tool,
      call_type: callType,
      title,
      subtitle: subtitle || null,
      input_data: inputData,
      output_data: outputData,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    if (existing?.id) {
      await supabase.from('recent_work').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('recent_work').insert(payload);
    }
  } catch (_) {
    // Silent — never surface errors from auto-save
  }
};

export const loadRecentWork = async (
  userId: string,
  tool: string,
  callType: string
): Promise<{ inputData: any; outputData: any; title: string; createdAt: string } | null> => {
  try {
    const { data } = await supabase
      .from('recent_work')
      .select('input_data, output_data, title, expires_at, created_at')
      .eq('user_id', userId)
      .eq('tool', tool)
      .eq('call_type', callType)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!data) return null;
    return {
      inputData: data.input_data,
      outputData: data.output_data,
      title: data.title,
      createdAt: data.created_at,
    };
  } catch (_) {
    return null;
  }
};

export const loadAllRecentWork = async (userId: string): Promise<any[]> => {
  try {
    const { data } = await supabase
      .from('recent_work')
      .select('id, tool, call_type, title, subtitle, created_at, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(6);
    return data || [];
  } catch (_) {
    return [];
  }
};
