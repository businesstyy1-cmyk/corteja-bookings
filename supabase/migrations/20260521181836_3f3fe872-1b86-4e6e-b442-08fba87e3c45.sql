
-- Roles
create type public.app_role as enum ('super_admin', 'owner');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users view own roles" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(),'super_admin'));
create policy "super admin manages roles" on public.user_roles for all using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles select own" on public.profiles for select using (auth.uid() = id or public.has_role(auth.uid(),'super_admin'));
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Shop status
create type public.shop_status as enum ('active','suspended','blocked','pending');

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  city text,
  phone text,
  logo_url text,
  status shop_status not null default 'active',
  created_at timestamptz not null default now()
);
create index shops_owner_idx on public.shops(owner_id);
alter table public.shops enable row level security;

create policy "public view active shops" on public.shops for select using (status = 'active' or owner_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));
create policy "owner inserts shop" on public.shops for insert with check (owner_id = auth.uid());
create policy "owner updates own shop" on public.shops for update using (owner_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));
create policy "super admin deletes shop" on public.shops for delete using (public.has_role(auth.uid(),'super_admin'));

-- helper: shop owned by user
create or replace function public.owns_shop(_shop_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.shops where id = _shop_id and owner_id = auth.uid())
$$;

create or replace function public.shop_is_active(_shop_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.shops where id = _shop_id and status = 'active')
$$;

-- Services
create table public.services (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0,
  duration_minutes integer not null default 30,
  description text,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index services_shop_idx on public.services(shop_id);
alter table public.services enable row level security;
create policy "public view active services" on public.services for select using ((active and public.shop_is_active(shop_id)) or public.owns_shop(shop_id) or public.has_role(auth.uid(),'super_admin'));
create policy "owner manages services" on public.services for all using (public.owns_shop(shop_id)) with check (public.owns_shop(shop_id));

-- Barbers
create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index barbers_shop_idx on public.barbers(shop_id);
alter table public.barbers enable row level security;
create policy "public view active barbers" on public.barbers for select using ((active and public.shop_is_active(shop_id)) or public.owns_shop(shop_id) or public.has_role(auth.uid(),'super_admin'));
create policy "owner manages barbers" on public.barbers for all using (public.owns_shop(shop_id)) with check (public.owns_shop(shop_id));

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  last_appointment_at timestamptz,
  created_at timestamptz not null default now(),
  unique(shop_id, phone)
);
create index clients_shop_idx on public.clients(shop_id);
alter table public.clients enable row level security;
create policy "owner manages clients" on public.clients for all using (public.owns_shop(shop_id)) with check (public.owns_shop(shop_id));

-- Appointments
create type public.appt_status as enum ('pending','confirmed','completed','cancelled');

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  barber_id uuid references public.barbers(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  client_phone text not null,
  scheduled_at timestamptz not null,
  status appt_status not null default 'pending',
  price numeric(10,2),
  notes text,
  created_at timestamptz not null default now()
);
create index appt_shop_idx on public.appointments(shop_id, scheduled_at);
alter table public.appointments enable row level security;
create policy "public creates appointment for active shop" on public.appointments for insert with check (public.shop_is_active(shop_id));
create policy "owner reads appointments" on public.appointments for select using (public.owns_shop(shop_id) or public.has_role(auth.uid(),'super_admin'));
create policy "owner updates appointments" on public.appointments for update using (public.owns_shop(shop_id));
create policy "owner deletes appointments" on public.appointments for delete using (public.owns_shop(shop_id));

-- Storage bucket
insert into storage.buckets (id, name, public) values ('shop-assets','shop-assets', true)
on conflict (id) do nothing;

create policy "public read shop assets" on storage.objects for select using (bucket_id = 'shop-assets');
create policy "auth upload shop assets" on storage.objects for insert with check (bucket_id = 'shop-assets' and auth.uid() is not null);
create policy "auth update own shop assets" on storage.objects for update using (bucket_id = 'shop-assets' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "auth delete own shop assets" on storage.objects for delete using (bucket_id = 'shop-assets' and auth.uid()::text = (storage.foldername(name))[1]);
