create extension if not exists pgcrypto;

create table if not exists public.contact_messages (
	id uuid primary key default gen_random_uuid(),
	first_name text not null,
	last_name text not null,
	email text not null,
	phone_number text,
	message text not null,
	source_page text,
	submitted_at timestamptz not null default now(),
	created_at timestamptz not null default now()
);

create table if not exists public.quote_requests (
	id uuid primary key default gen_random_uuid(),
	customer_name text not null,
	customer_email text not null,
	customer_phone text not null,
	customer_address text not null,
	customer_city text not null,
	customer_state text not null,
	customer_zip text not null,
	quote_summary text not null,
	total_keys integer,
	estimated_payout text,
	source_page text,
	submitted_at text not null,
	created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;
alter table public.quote_requests enable row level security;

drop policy if exists "Allow public inserts on contact_messages" on public.contact_messages;
create policy "Allow public inserts on contact_messages"
on public.contact_messages
for insert
to anon
with check (true);

drop policy if exists "Allow public inserts on quote_requests" on public.quote_requests;
create policy "Allow public inserts on quote_requests"
on public.quote_requests
for insert
to anon
with check (true);
