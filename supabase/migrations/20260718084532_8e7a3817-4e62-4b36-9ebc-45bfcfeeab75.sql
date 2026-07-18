-- Restore EXECUTE for anon on RLS helper functions used in policies that may be evaluated for anonymous users
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.has_group_role(uuid, uuid, text[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_group_role(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_room_participant_safe(uuid, uuid) TO anon;