alter table public.contact_messages
add column if not exists status text not null default 'new';

update public.contact_messages
set status = 'new'
where status is null;

alter table public.contact_messages
drop constraint if exists contact_messages_status_check;

alter table public.contact_messages
add constraint contact_messages_status_check
check (status in ('new', 'replied'));
