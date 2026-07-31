alter table public.profiles
	add column if not exists phone_number text,
	add column if not exists mailing_address text,
	add column if not exists city text,
	add column if not exists state text,
	add column if not exists zip_code text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
	insert into public.profiles (
		id,
		email,
		full_name,
		phone_number,
		mailing_address,
		city,
		state,
		zip_code
	)
	values (
		new.id,
		coalesce(new.email, ''),
		nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
		nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone_number', '')), ''),
		nullif(trim(coalesce(new.raw_user_meta_data ->> 'mailing_address', '')), ''),
		nullif(trim(coalesce(new.raw_user_meta_data ->> 'city', '')), ''),
		nullif(upper(trim(coalesce(new.raw_user_meta_data ->> 'state', ''))), ''),
		nullif(trim(coalesce(new.raw_user_meta_data ->> 'zip_code', '')), '')
	)
	on conflict (id) do update set
		email = excluded.email,
		full_name = coalesce(public.profiles.full_name, excluded.full_name),
		phone_number = coalesce(public.profiles.phone_number, excluded.phone_number),
		mailing_address = coalesce(public.profiles.mailing_address, excluded.mailing_address),
		city = coalesce(public.profiles.city, excluded.city),
		state = coalesce(public.profiles.state, excluded.state),
		zip_code = coalesce(public.profiles.zip_code, excluded.zip_code),
		updated_at = now();
	return new;
end;
$$;
