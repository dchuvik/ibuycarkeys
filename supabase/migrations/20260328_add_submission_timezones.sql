alter table public.contact_messages
add column if not exists client_timezone text,
add column if not exists client_utc_offset_minutes integer;

alter table public.quote_requests
add column if not exists client_timezone text,
add column if not exists client_utc_offset_minutes integer;
