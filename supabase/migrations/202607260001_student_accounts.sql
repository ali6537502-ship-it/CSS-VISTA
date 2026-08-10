-- CSS Vista student account progress.
-- Run this migration in the connected Supabase project before enabling account sign-in.

create table if not exists public.student_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_progress enable row level security;

drop policy if exists "Students can read their own progress" on public.student_progress;
create policy "Students can read their own progress"
on public.student_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Students can create their own progress" on public.student_progress;
create policy "Students can create their own progress"
on public.student_progress
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Students can update their own progress" on public.student_progress;
create policy "Students can update their own progress"
on public.student_progress
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Students can delete their own progress" on public.student_progress;
create policy "Students can delete their own progress"
on public.student_progress
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.student_progress from anon;
grant select, insert, update, delete on table public.student_progress to authenticated;
