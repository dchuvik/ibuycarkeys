alter table public.key_catalog_items
add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('key-catalog-images', 'key-catalog-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read key catalog images" on storage.objects;
create policy "Public read key catalog images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'key-catalog-images');
