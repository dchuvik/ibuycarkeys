create table if not exists public.profiles (
	id uuid primary key references auth.users(id) on delete cascade,
	email text not null unique,
	full_name text,
	phone text,
	address text,
	city text,
	state text,
	zip text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_current_timestamp_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.profiles (id, email, full_name, phone)
	values (
		new.id,
		new.email,
		nullif(new.raw_user_meta_data ->> 'full_name', ''),
		nullif(new.raw_user_meta_data ->> 'phone', '')
	)
	on conflict (id) do update
	set
		email = excluded.email,
		full_name = coalesce(excluded.full_name, public.profiles.full_name),
		phone = coalesce(excluded.phone, public.profiles.phone),
		updated_at = now();

	return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

alter table public.quote_requests
add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists quote_requests_user_id_idx on public.quote_requests(user_id);

drop policy if exists "Allow public inserts on quote_requests" on public.quote_requests;
create policy "Allow public inserts on quote_requests"
on public.quote_requests
for insert
to anon
with check (user_id is null);

drop policy if exists "Allow authenticated inserts on quote_requests" on public.quote_requests;
create policy "Allow authenticated inserts on quote_requests"
on public.quote_requests
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Allow users to read own quote_requests" on public.quote_requests;
create policy "Allow users to read own quote_requests"
on public.quote_requests
for select
to authenticated
using (auth.uid() = user_id);
