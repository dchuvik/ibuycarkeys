alter table public.key_catalog_items
add column if not exists key_type text;

create index if not exists key_catalog_items_key_type_idx
on public.key_catalog_items (key_type);
