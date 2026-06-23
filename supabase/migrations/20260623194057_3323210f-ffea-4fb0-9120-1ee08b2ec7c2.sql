
-- Re-grant execute on the security-definer helpers so RLS can call them
grant execute on function private.owns_shop(uuid) to authenticated, service_role;
grant execute on function private.shop_is_active(uuid) to anon, authenticated, service_role;
grant execute on function private.has_role(uuid, public.app_role) to authenticated, service_role;

-- profiles
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select to authenticated
  using (auth.uid() = id or private.has_role(auth.uid(),'super_admin'));

-- user_roles
drop policy if exists "users view own roles" on public.user_roles;
drop policy if exists "super admin manages roles" on public.user_roles;
create policy "users view own roles" on public.user_roles
  for select to authenticated
  using (auth.uid() = user_id or private.has_role(auth.uid(),'super_admin'));
create policy "super admin manages roles" on public.user_roles
  for all to authenticated
  using (private.has_role(auth.uid(),'super_admin'))
  with check (private.has_role(auth.uid(),'super_admin'));

-- shops
drop policy if exists "public view active shops" on public.shops;
drop policy if exists "owner updates own shop" on public.shops;
drop policy if exists "super admin deletes shop" on public.shops;
create policy "public view active shops" on public.shops
  for select to anon, authenticated
  using (status = 'active' or owner_id = auth.uid() or private.has_role(auth.uid(),'super_admin'));
create policy "owner updates own shop" on public.shops
  for update to authenticated
  using (owner_id = auth.uid() or private.has_role(auth.uid(),'super_admin'));
create policy "super admin deletes shop" on public.shops
  for delete to authenticated
  using (private.has_role(auth.uid(),'super_admin'));

-- services
drop policy if exists "public view active services" on public.services;
drop policy if exists "owner manages services" on public.services;
create policy "public view active services" on public.services
  for select to anon, authenticated
  using ((active and private.shop_is_active(shop_id)) or private.owns_shop(shop_id) or private.has_role(auth.uid(),'super_admin'));
create policy "owner manages services" on public.services
  for all to authenticated
  using (private.owns_shop(shop_id))
  with check (private.owns_shop(shop_id));

-- barbers
drop policy if exists "public view active barbers" on public.barbers;
drop policy if exists "owner manages barbers" on public.barbers;
create policy "public view active barbers" on public.barbers
  for select to anon, authenticated
  using ((active and private.shop_is_active(shop_id)) or private.owns_shop(shop_id) or private.has_role(auth.uid(),'super_admin'));
create policy "owner manages barbers" on public.barbers
  for all to authenticated
  using (private.owns_shop(shop_id))
  with check (private.owns_shop(shop_id));

-- clients
drop policy if exists "owner manages clients" on public.clients;
create policy "owner manages clients" on public.clients
  for all to authenticated
  using (private.owns_shop(shop_id))
  with check (private.owns_shop(shop_id));

-- appointments
drop policy if exists "public creates appointment for active shop" on public.appointments;
drop policy if exists "owner reads appointments" on public.appointments;
drop policy if exists "owner updates appointments" on public.appointments;
drop policy if exists "owner deletes appointments" on public.appointments;
create policy "public creates appointment for active shop" on public.appointments
  for insert to anon, authenticated
  with check (
    private.shop_is_active(shop_id)
    and status = 'pending'
    and client_name is not null and length(btrim(client_name)) between 1 and 120
    and client_phone is not null and length(btrim(client_phone)) between 6 and 32
    and (notes is null or length(notes) <= 500)
  );
create policy "owner reads appointments" on public.appointments
  for select to authenticated
  using (private.owns_shop(shop_id) or private.has_role(auth.uid(),'super_admin'));
create policy "owner updates appointments" on public.appointments
  for update to authenticated
  using (private.owns_shop(shop_id));
create policy "owner deletes appointments" on public.appointments
  for delete to authenticated
  using (private.owns_shop(shop_id));
