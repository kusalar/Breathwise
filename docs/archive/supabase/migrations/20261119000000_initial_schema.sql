-- ==============================================================================
-- BreatheWise AI — Supabase Database Migration
-- Version: 20261119000000_initial_schema.sql
-- Description: Core tables, constraints, indexes, and Row Level Security (RLS)
-- ==============================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. USER PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    default_city TEXT DEFAULT 'Siliguri' NOT NULL,
    default_region TEXT DEFAULT 'West Bengal' NOT NULL,
    default_country TEXT DEFAULT 'India' NOT NULL,
    default_latitude NUMERIC(8, 5) DEFAULT 26.7271 NOT NULL,
    default_longitude NUMERIC(8, 5) DEFAULT 88.3953 NOT NULL,
    preferred_aqi_standard TEXT DEFAULT 'CPCB_INDIA' NOT NULL,
    theme TEXT DEFAULT 'system' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_user_pref UNIQUE (user_id)
);

-- 3. HOUSEHOLD MEMBERS TABLE (Optional family protection profiles)
CREATE TABLE IF NOT EXISTS public.household_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relation TEXT NOT NULL, -- 'self', 'child', 'elderly', 'partner', 'other'
    age_years INT,
    vulnerability_level TEXT DEFAULT 'standard' NOT NULL, -- 'standard', 'high', 'critical'
    respiratory_sensitivity BOOLEAN DEFAULT FALSE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. SAVED ROUTINES TABLE
CREATE TABLE IF NOT EXISTS public.saved_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    routine_payload JSONB NOT NULL,
    target_date DATE DEFAULT CURRENT_DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. CHAT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Environmental Health Session' NOT NULL,
    location_name TEXT DEFAULT 'Siliguri' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. SUSTAINABILITY ACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.sustainability_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- 'commute', 'waste', 'energy', 'home'
    action_description TEXT NOT NULL,
    estimated_co2_saved_kg NUMERIC(6, 2) DEFAULT 0.00 NOT NULL,
    estimated_particulate_avoided_pct NUMERIC(5, 2) DEFAULT 0.00,
    recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. NOTIFICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email_alerts_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    severe_smog_threshold INT DEFAULT 300 NOT NULL,
    daily_briefing_time TIME DEFAULT '07:00:00' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_user_notif UNIQUE (user_id)
);

-- ==============================================================================
-- INDEXES FOR QUERY OPTIMIZATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_user_preferences_uid ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_uid ON public.household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_routines_uid ON public.saved_routines(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_uid ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sid ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_sustainability_actions_uid ON public.sustainability_actions(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sustainability_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 2. USER PREFERENCES POLICIES
CREATE POLICY "Users can view own preferences"
    ON public.user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON public.user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON public.user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- 3. HOUSEHOLD MEMBERS POLICIES
CREATE POLICY "Users can view own household"
    ON public.household_members FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own household members"
    ON public.household_members FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own household members"
    ON public.household_members FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own household members"
    ON public.household_members FOR DELETE
    USING (auth.uid() = user_id);

-- 4. SAVED ROUTINES POLICIES
CREATE POLICY "Users can view own routines"
    ON public.saved_routines FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own routines"
    ON public.saved_routines FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routines"
    ON public.saved_routines FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own routines"
    ON public.saved_routines FOR DELETE
    USING (auth.uid() = user_id);

-- 5. CHAT SESSIONS POLICIES
CREATE POLICY "Users can view own chat sessions"
    ON public.chat_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat sessions"
    ON public.chat_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions"
    ON public.chat_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- 6. CHAT MESSAGES POLICIES
CREATE POLICY "Users can view own messages"
    ON public.chat_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
    ON public.chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 7. SUSTAINABILITY ACTIONS POLICIES
CREATE POLICY "Users can view own actions"
    ON public.sustainability_actions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own actions"
    ON public.sustainability_actions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own actions"
    ON public.sustainability_actions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own actions"
    ON public.sustainability_actions FOR DELETE
    USING (auth.uid() = user_id);

-- 8. NOTIFICATION PREFERENCES POLICIES
CREATE POLICY "Users can view own notification prefs"
    ON public.notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notification prefs"
    ON public.notification_preferences FOR ALL
    USING (auth.uid() = user_id);

