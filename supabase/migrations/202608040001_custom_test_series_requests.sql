-- Customized test-series requests for Miss Sadia Zahoor, PAS.

create table if not exists public.custom_test_series_requests (
  request_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null default '',
  student_email text not null default '',
  phone text not null default '',
  subjects text[] not null default '{}',
  test_count integer not null check (test_count between 1 and 60),
  scheduling_mode text not null check (scheduling_mode in ('automatic', 'fixed-gap')),
  start_date date not null,
  duration_days integer not null check (duration_days between 1 and 730),
  gap_days integer not null check (gap_days between 1 and 90),
  schedule jsonb not null default '[]'::jsonb,
  unit_price integer check (unit_price is null or unit_price in (800, 1000, 1200)),
  total_fee integer check (total_fee is null or total_fee >= 0),
  status text not null default 'submitted'
    check (status in ('submitted', 'contacted', 'approved', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_test_series_user_time_idx
  on public.custom_test_series_requests (user_id, created_at desc);

create index if not exists custom_test_series_status_time_idx
  on public.custom_test_series_requests (status, created_at desc);

drop trigger if exists custom_test_series_touch_updated_at on public.custom_test_series_requests;
create trigger custom_test_series_touch_updated_at
before update on public.custom_test_series_requests
for each row execute function public.touch_updated_at();

alter table public.custom_test_series_requests enable row level security;

drop policy if exists "Students create their own test-series requests" on public.custom_test_series_requests;
create policy "Students create their own test-series requests"
on public.custom_test_series_requests for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Students read their own test-series requests" on public.custom_test_series_requests;
create policy "Students read their own test-series requests"
on public.custom_test_series_requests for select to authenticated
using ((select auth.uid()) = user_id or public.is_css_vista_admin());

drop policy if exists "Students update their own submitted request" on public.custom_test_series_requests;
create policy "Students update their own submitted request"
on public.custom_test_series_requests for update to authenticated
using ((select auth.uid()) = user_id and status = 'submitted')
with check ((select auth.uid()) = user_id and status = 'submitted');

drop policy if exists "Admins update test-series requests" on public.custom_test_series_requests;
create policy "Admins update test-series requests"
on public.custom_test_series_requests for update to authenticated
using (public.is_css_vista_admin())
with check (public.is_css_vista_admin());

drop policy if exists "Admins delete test-series requests" on public.custom_test_series_requests;
create policy "Admins delete test-series requests"
on public.custom_test_series_requests for delete to authenticated
using (public.is_css_vista_admin());

revoke all on table public.custom_test_series_requests from anon;
grant select, insert, update on table public.custom_test_series_requests to authenticated;
grant delete on table public.custom_test_series_requests to authenticated;
