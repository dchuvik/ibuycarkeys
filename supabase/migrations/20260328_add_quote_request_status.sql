alter table public.quote_requests
add column if not exists status text not null default 'new';

update public.quote_requests
set status = 'new'
where status is null;

alter table public.quote_requests
drop constraint if exists quote_requests_status_check;

alter table public.quote_requests
add constraint quote_requests_status_check
check (status in ('new', 'approved', 'rejected'));
