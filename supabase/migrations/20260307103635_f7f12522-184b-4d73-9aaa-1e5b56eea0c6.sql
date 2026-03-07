
-- ─── admin_users (must come first for FK references in RLS) ─────────────────
CREATE TABLE public.admin_users (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin','admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Security definer function to check admin status (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = _user_id
  )
$$;

CREATE POLICY "Admins can view admin table" ON public.admin_users FOR SELECT USING (
  public.is_admin(auth.uid())
);

-- ─── user_profiles ───────────────────────────────────────────────────────────
CREATE TABLE public.user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL DEFAULT '',
  phone           TEXT DEFAULT '',
  access_tier     TEXT NOT NULL DEFAULT 'basic' CHECK (access_tier IN ('basic','premium','beta','revoked')),
  payment_status  TEXT NOT NULL DEFAULT 'reserved' CHECK (payment_status IN ('reserved','paid','beta','none')),
  payment_amount  INTEGER DEFAULT 0,
  added_by        TEXT DEFAULT 'admin',
  notes           TEXT DEFAULT '',
  is_beta_user    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can do all on profiles" ON public.user_profiles FOR ALL USING (
  public.is_admin(auth.uid())
);

-- ─── user_sessions ───────────────────────────────────────────────────────────
CREATE TABLE public.user_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start    TIMESTAMPTZ DEFAULT NOW(),
  session_end      TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  pages_visited    JSONB DEFAULT '[]',
  device_type      TEXT DEFAULT 'unknown',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own sessions" ON public.user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.user_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own sessions" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all sessions" ON public.user_sessions FOR SELECT USING (
  public.is_admin(auth.uid())
);

-- ─── tool_usage ──────────────────────────────────────────────────────────────
CREATE TABLE public.tool_usage (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id       UUID REFERENCES public.user_sessions(id) ON DELETE SET NULL,
  tool_id          TEXT NOT NULL,
  opened_at        TIMESTAMPTZ DEFAULT NOW(),
  time_spent_secs  INTEGER DEFAULT 0,
  actions_count    INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.tool_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own tool_usage" ON public.tool_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tool_usage" ON public.tool_usage FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all tool_usage" ON public.tool_usage FOR SELECT USING (
  public.is_admin(auth.uid())
);

-- ─── beta_feedback ───────────────────────────────────────────────────────────
CREATE TABLE public.beta_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback_text TEXT NOT NULL DEFAULT '',
  tool_used     TEXT DEFAULT 'general',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own feedback" ON public.beta_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all feedback" ON public.beta_feedback FOR SELECT USING (
  public.is_admin(auth.uid())
);

-- ─── increment function for tool actions ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_tool_actions(row_id UUID)
RETURNS VOID AS $$
  UPDATE public.tool_usage SET actions_count = actions_count + 1 WHERE id = row_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ─── Auto-create profile on signup trigger ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
