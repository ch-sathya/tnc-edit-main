
-- Fix the search path warning on the trigger function
ALTER FUNCTION public.handle_new_user_credits() SET search_path = 'public';
