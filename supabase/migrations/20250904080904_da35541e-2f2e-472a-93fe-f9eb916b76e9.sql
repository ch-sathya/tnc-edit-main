-- Fix function search path mutable issue for the trigger function
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;