-- Auth fix bundle: RLS recursion + missing profiles
-- Run this in Supabase SQL Editor if sign-in/register fails.
-- Safe to run multiple times. Does NOT re-create tables from 001.

-- 1) Fix infinite recursion on profiles (admin policies must not query profiles under RLS)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "profiles admin read all" on public.profiles;
create policy "profiles admin read all"
on public.profiles for select
using (public.is_admin());

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update"
on public.profiles for update
using (public.is_admin());

-- 2) Ensure profile rows exist for all auth users
alter table public.profiles add column if not exists email text;

create or replace function public.ensure_my_profile(p_full_name text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_email text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select email into user_email from auth.users where id = uid;

  insert into public.profiles (id, role, full_name, email, trial_credits)
  values (uid, 'client', coalesce(p_full_name, ''), user_email, 5)
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(
      nullif(public.profiles.full_name, ''),
      excluded.full_name
    ),
    updated_at = now();
end;
$$;

revoke all on function public.ensure_my_profile(text) from public;
grant execute on function public.ensure_my_profile(text) to authenticated;

insert into public.profiles (id, role, full_name, email, trial_credits)
select u.id, 'client', coalesce(u.raw_user_meta_data->>'full_name', ''), u.email, 5
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
