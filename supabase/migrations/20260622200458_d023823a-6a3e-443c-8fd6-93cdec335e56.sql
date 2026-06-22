
revoke execute on function private.owns_shop(uuid) from anon, authenticated;
revoke execute on function private.shop_is_active(uuid) from anon, authenticated;
revoke execute on function private.has_role(uuid, public.app_role) from anon, authenticated;
-- Keep execute for postgres (table owner) and service_role; RLS policies are evaluated
-- with the table owner's privileges sufficient to call these helpers.
