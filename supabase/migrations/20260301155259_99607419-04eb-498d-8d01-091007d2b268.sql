
-- Plan tiers table
CREATE TABLE public.plan_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  billing_period text NOT NULL DEFAULT 'monthly',
  credits_per_month integer NOT NULL DEFAULT 10,
  max_private_repos integer NOT NULL DEFAULT 0,
  max_projects integer NOT NULL DEFAULT 3,
  max_collab_rooms integer NOT NULL DEFAULT 1,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default plans
INSERT INTO public.plan_tiers (name, display_name, price_cents, credits_per_month, max_private_repos, max_projects, max_collab_rooms, features) VALUES
  ('free', 'Free', 0, 10, 0, 3, 1, '["Basic Code Editor", "Community Access", "3 Projects", "10 AI Credits/month"]'::jsonb),
  ('pro', 'Pro', 2900, 200, 10, -1, -1, '["Advanced Code Editor", "Priority Support", "Unlimited Projects", "200 AI Credits/month", "10 Private Repos"]'::jsonb),
  ('team', 'Team', 9900, 1000, -1, -1, -1, '["Everything in Pro", "Team Management", "Custom Integrations", "1000 AI Credits/month", "Unlimited Private Repos", "SLA Guarantee"]'::jsonb);

-- User subscriptions
CREATE TABLE public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plan_tiers(id),
  status text NOT NULL DEFAULT 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- User credits
CREATE TABLE public.user_credits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining integer NOT NULL DEFAULT 10,
  credits_used integer NOT NULL DEFAULT 0,
  last_reset_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- AI chat history for vibe coding
CREATE TABLE public.ai_chat_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL,
  content text NOT NULL,
  model text DEFAULT 'google/gemini-3-flash-preview',
  tokens_used integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plan_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

-- Plan tiers: readable by everyone
CREATE POLICY "Anyone can view plan tiers" ON public.plan_tiers FOR SELECT USING (true);

-- Subscriptions: users manage their own
CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscription" ON public.user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscription" ON public.user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Credits: users manage their own
CREATE POLICY "Users can view their own credits" ON public.user_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own credits" ON public.user_credits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own credits" ON public.user_credits FOR UPDATE USING (auth.uid() = user_id);

-- AI chat: users manage their own
CREATE POLICY "Users can view their own AI chats" ON public.ai_chat_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own AI chats" ON public.ai_chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create credits when user signs up (via trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  free_plan_id uuid;
BEGIN
  SELECT id INTO free_plan_id FROM public.plan_tiers WHERE name = 'free' LIMIT 1;
  
  INSERT INTO public.user_credits (user_id, credits_remaining) VALUES (NEW.id, 10)
  ON CONFLICT (user_id) DO NOTHING;
  
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (user_id, plan_id) VALUES (NEW.id, free_plan_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_credits();
