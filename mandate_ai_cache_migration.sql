-- H2 residual fix: move AI/LinkedIn cache off the public-readable mandates table
-- into a staff-only table so a logged-in candidate/client can't read cached
-- candidate names/scores/LinkedIn profiles via a direct query.

create table if not exists public.mandate_ai_cache (
  mandate_id uuid primary key references public.mandates(id) on delete cascade,
  talent_pool_cache jsonb,
  talent_pool_cached_at timestamptz,
  linkedin_search_cache jsonb,
  updated_at timestamptz not null default now()
);

-- Migrate any existing cached data across.
insert into public.mandate_ai_cache (mandate_id, talent_pool_cache, talent_pool_cached_at, linkedin_search_cache)
select id, talent_pool_cache, talent_pool_cached_at, linkedin_search_cache
from public.mandates
where talent_pool_cache is not null
   or talent_pool_cached_at is not null
   or linkedin_search_cache is not null
on conflict (mandate_id) do nothing;

-- Lock it down: RLS on, only active staff (by email in staff_users) may touch it.
alter table public.mandate_ai_cache enable row level security;

drop policy if exists mandate_ai_cache_staff_all on public.mandate_ai_cache;
create policy mandate_ai_cache_staff_all
  on public.mandate_ai_cache
  for all
  to authenticated
  using (exists (
    select 1 from public.staff_users s
    where s.email = (auth.jwt() ->> 'email') and s.is_active
  ))
  with check (exists (
    select 1 from public.staff_users s
    where s.email = (auth.jwt() ->> 'email') and s.is_active
  ));

-- Table-level grants: authenticated only (RLS then restricts to staff); never anon.
grant select, insert, update, delete on public.mandate_ai_cache to authenticated;
revoke all on public.mandate_ai_cache from anon;
