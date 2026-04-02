create table if not exists public.quote_request_items (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  sku text not null,
  make text not null,
  description text not null,
  condition text not null,
  quantity integer not null,
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) not null,
  created_at timestamptz not null default now(),
  constraint quote_request_items_quantity_positive check (quantity > 0),
  constraint quote_request_items_unit_price_nonnegative check (unit_price >= 0),
  constraint quote_request_items_line_total_nonnegative check (line_total >= 0)
);

create index if not exists quote_request_items_quote_request_id_idx
on public.quote_request_items (quote_request_id);

create index if not exists quote_request_items_sku_idx
on public.quote_request_items (sku);

alter table public.quote_request_items enable row level security;

drop policy if exists "Allow public inserts on quote_request_items" on public.quote_request_items;
create policy "Allow public inserts on quote_request_items"
on public.quote_request_items
for insert
to anon
with check (true);
