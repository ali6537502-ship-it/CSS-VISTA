-- Signed-in student MCQ error reports, visible only to CSS Vista administrators.

create table if not exists public.mcq_error_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id text not null check (char_length(question_id) between 1 and 160),
  note text not null default '' check (char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create index if not exists mcq_error_reports_status_time_idx
  on public.mcq_error_reports (status, created_at desc);

alter table public.mcq_error_reports enable row level security;

drop policy if exists "Students create their own MCQ reports" on public.mcq_error_reports;
create policy "Students create their own MCQ reports"
on public.mcq_error_reports for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Students read their own MCQ reports" on public.mcq_error_reports;
create policy "Students read their own MCQ reports"
on public.mcq_error_reports for select to authenticated
using ((select auth.uid()) = user_id or public.is_css_vista_admin());

drop policy if exists "Admins update MCQ reports" on public.mcq_error_reports;
create policy "Admins update MCQ reports"
on public.mcq_error_reports for update to authenticated
using (public.is_css_vista_admin())
with check (public.is_css_vista_admin());

drop policy if exists "Admins delete MCQ reports" on public.mcq_error_reports;
create policy "Admins delete MCQ reports"
on public.mcq_error_reports for delete to authenticated
using (public.is_css_vista_admin());

revoke all on table public.mcq_error_reports from anon, authenticated;
grant select, insert on table public.mcq_error_reports to authenticated;
grant update, delete on table public.mcq_error_reports to authenticated;

