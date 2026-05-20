-- chat_sessions
create table if not exists public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'New Chat',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists chat_sessions_user_id_idx on public.chat_sessions(user_id);
create index if not exists chat_sessions_updated_at_idx on public.chat_sessions(updated_at desc);
alter table public.chat_sessions enable row level security;
create policy "Users can view own sessions" on public.chat_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on public.chat_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on public.chat_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own sessions" on public.chat_sessions for delete using (auth.uid() = user_id);

-- chat_messages
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  image_urls text[] default '{}',
  created_at timestamptz default now() not null
);
create index if not exists chat_messages_session_id_idx on public.chat_messages(session_id);
create index if not exists chat_messages_created_at_idx on public.chat_messages(created_at asc);
alter table public.chat_messages enable row level security;
create policy "Users can view own messages" on public.chat_messages for select using (auth.uid() = user_id);
create policy "Users can insert own messages" on public.chat_messages for insert with check (auth.uid() = user_id);

-- Atomic credit deduction adapted to user_credits.balance schema
create or replace function public.deduct_chat_credits(p_user_id uuid, p_amount int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current int;
  v_new int;
begin
  select balance into v_current from public.user_credits where user_id = p_user_id for update;
  if v_current is null then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;
  if v_current < p_amount then
    return jsonb_build_object('success', false, 'error', 'insufficient_credits', 'balance', v_current, 'required', p_amount);
  end if;
  v_new := v_current - p_amount;
  update public.user_credits
    set balance = v_new,
        lifetime_spent = lifetime_spent + p_amount,
        updated_at = now()
   where user_id = p_user_id;
  insert into public.credit_transactions (user_id, type, amount, balance_after, description, tool_module, call_type)
  values (p_user_id, 'deduction', -p_amount, v_new, 'AskAbhinavAI chat', 'ask_abhinav_ai', case when p_amount >= 6 then 'chat_image' else 'chat_text' end);
  return jsonb_build_object('success', true, 'new_balance', v_new);
end;
$$;

-- Storage bucket
insert into storage.buckets (id, name, public) values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

create policy "Users can upload chat images"
  on storage.objects for insert
  with check (bucket_id = 'chat-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Public read for chat images"
  on storage.objects for select
  using (bucket_id = 'chat-images');

create policy "Users can delete own chat images"
  on storage.objects for delete
  using (bucket_id = 'chat-images' and auth.uid()::text = (storage.foldername(name))[1]);