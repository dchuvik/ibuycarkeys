create table if not exists public.key_catalog_items (
	sku text primary key,
	make text not null,
	description text not null,
	excellent_price numeric(10, 2) not null default 0,
	adjusted_price numeric(10, 2),
	inventory_count integer not null default 0,
	max_order_quantity integer not null default 25,
	active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint key_catalog_items_inventory_count_check check (inventory_count >= 0),
	constraint key_catalog_items_max_order_quantity_check check (max_order_quantity >= 0)
);

alter table public.key_catalog_items enable row level security;

drop policy if exists "Public read key catalog items" on public.key_catalog_items;
create policy "Public read key catalog items"
on public.key_catalog_items
for select
to anon, authenticated
using (active = true);
