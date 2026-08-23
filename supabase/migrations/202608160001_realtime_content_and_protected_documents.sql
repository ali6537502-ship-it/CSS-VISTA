-- Realtime CMS refresh and a private bucket for authenticated academic samples.

do $$
begin
  alter publication supabase_realtime add table public.site_content;
exception
  when duplicate_object then null;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'protected-academic-samples',
  'protected-academic-samples',
  false,
  52428800,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Signed-in students view protected academic samples" on storage.objects;
create policy "Signed-in students view protected academic samples"
on storage.objects for select to authenticated
using (bucket_id = 'protected-academic-samples');

drop policy if exists "Admins upload protected academic samples" on storage.objects;
create policy "Admins upload protected academic samples"
on storage.objects for insert to authenticated
with check (bucket_id = 'protected-academic-samples' and public.is_css_vista_admin());

drop policy if exists "Admins update protected academic samples" on storage.objects;
create policy "Admins update protected academic samples"
on storage.objects for update to authenticated
using (bucket_id = 'protected-academic-samples' and public.is_css_vista_admin())
with check (bucket_id = 'protected-academic-samples' and public.is_css_vista_admin());

drop policy if exists "Admins delete protected academic samples" on storage.objects;
create policy "Admins delete protected academic samples"
on storage.objects for delete to authenticated
using (bucket_id = 'protected-academic-samples' and public.is_css_vista_admin());
