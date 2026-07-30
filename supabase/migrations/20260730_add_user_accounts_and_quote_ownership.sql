create table if not exists public.profiles (
	id uuid primary key references auth.users(id) on delete cascade,
	email text not null,
	full_name text,
	role text not null default 'customer',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint profiles_role_check check (role in ('customer', 'admin'))
);

alter table public.profiles
	add column if not exists email text,
	add column if not exists full_name text,
	add column if not exists role text default 'customer',
	add column if not exists created_at timestamptz default now(),
	add column if not exists updated_at timestamptz default now();

update public.profiles as profiles
set
	email = coalesce(profiles.email, users.email, ''),
	role = coalesce(profiles.role, 'customer'),
	created_at = coalesce(profiles.created_at, now()),
	updated_at = coalesce(profiles.updated_at, now())
from auth.users as users
where profiles.id = users.id;

update public.profiles
set
	email = coalesce(email, ''),
	role = coalesce(role, 'customer'),
	created_at = coalesce(created_at, now()),
	updated_at = coalesce(updated_at, now());

alter table public.profiles
	alter column email set not null,
	alter column role set default 'customer',
	alter column role set not null,
	alter column created_at set default now(),
	alter column created_at set not null,
	alter column updated_at set default now(),
	alter column updated_at set not null;

do $$
begin
	if not exists (
		select 1
		from pg_constraint
		where conname = 'profiles_role_check'
			and conrelid = 'public.profiles'::regclass
	) then
		alter table public.profiles
			add constraint profiles_role_check check (role in ('customer', 'admin'));
	end if;
end
$$;

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
	insert into public.profiles (id, email, full_name)
	values (
		new.id,
		coalesce(new.email, ''),
		nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
	)
	on conflict (id) do nothing;
	return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
	after insert on auth.users
	for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email, full_name)
select
	id,
	coalesce(email, ''),
	nullif(trim(coalesce(raw_user_meta_data ->> 'full_name', '')), '')
from auth.users
on conflict (id) do nothing;

alter table public.quote_requests
	add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists quote_requests_user_id_idx
	on public.quote_requests (user_id);

drop policy if exists "Users can read their own quote requests" on public.quote_requests;
create policy "Users can read their own quote requests"
on public.quote_requests
for select
to authenticated
using (auth.uid() = user_id);
