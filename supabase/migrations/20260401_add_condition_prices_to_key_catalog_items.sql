alter table public.key_catalog_items
add column if not exists light_scratches_price numeric(10,2),
add column if not exists worn_price numeric(10,2);

update public.key_catalog_items
set
  light_scratches_price = coalesce(light_scratches_price, adjusted_price),
  worn_price = coalesce(worn_price, adjusted_price)
where adjusted_price is not null;
