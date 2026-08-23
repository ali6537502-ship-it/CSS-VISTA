-- Resolve database-advisor findings without weakening row-level security.

create or replace function public.is_css_vista_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select check_user_id = (select auth.uid()) and exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

revoke all on function public.create_css_vista_profile() from public, anon, authenticated;

create index if not exists admin_users_created_by_idx on public.admin_users (created_by);
create index if not exists mcq_error_reports_user_idx on public.mcq_error_reports (user_id);
create index if not exists mcq_error_reports_resolved_by_idx on public.mcq_error_reports (resolved_by);
create index if not exists site_content_updated_by_idx on public.site_content (updated_by);
create index if not exists site_content_versions_created_by_idx on public.site_content_versions (created_by);

drop policy if exists "Students can read their own progress" on public.student_progress;
drop policy if exists "Admins read all progress" on public.student_progress;
create policy "Students or admins read progress"
on public.student_progress for select to authenticated
using ((select auth.uid()) = user_id or public.is_css_vista_admin());

drop policy if exists "Students update their own submitted request" on public.custom_test_series_requests;
drop policy if exists "Admins update test-series requests" on public.custom_test_series_requests;
create policy "Students or admins update test-series requests"
on public.custom_test_series_requests for update to authenticated
using (((select auth.uid()) = user_id and status = 'submitted') or public.is_css_vista_admin())
with check (((select auth.uid()) = user_id and status = 'submitted') or public.is_css_vista_admin());
