
-- 1) Move SECURITY DEFINER helpers out of the public (PostgREST-exposed) schema
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

alter function public.owns_shop(uuid) set schema private;
alter function public.shop_is_active(uuid) set schema private;
alter function public.has_role(uuid, public.app_role) set schema private;

-- Lock down execute rights; grant only what RLS/app needs
revoke execute on function private.owns_shop(uuid) from public;
revoke execute on function private.shop_is_active(uuid) from public;
revoke execute on function private.has_role(uuid, public.app_role) from public;

grant execute on function private.owns_shop(uuid) to authenticated, service_role;
grant execute on function private.shop_is_active(uuid) to anon, authenticated, service_role;
grant execute on function private.has_role(uuid, public.app_role) to authenticated, service_role;

-- 2) Tighten public appointment INSERT with validation
drop policy if exists "public creates appointment for active shop" on public.appointments;
create policy "public creates appointment for active shop"
on public.appointments
for insert
to anon, authenticated
with check (
  private.shop_is_active(shop_id)
  and status = 'pending'
  and client_name is not null and length(btrim(client_name)) between 1 and 120
  and client_phone is not null and length(btrim(client_phone)) between 6 and 32
  and (notes is null or length(notes) <= 500)
);

-- 3) Storage: scope shop-assets uploads to the owner's folder; drop broad listing policy
drop policy if exists "auth upload shop assets" on storage.objects;
create policy "auth upload shop assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'shop-assets'
  and (auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "public read shop assets" on storage.objects;
-- Files remain accessible via public object URLs (bucket is public); no listing policy needed.
