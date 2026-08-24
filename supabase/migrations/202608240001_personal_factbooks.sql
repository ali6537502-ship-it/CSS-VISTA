-- CSS VISTA personal Factbooks.
-- Private-by-default structured study material for authenticated students.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.factbook_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  icon text not null default 'book',
  cover_style text not null default 'classic' check (cover_style in ('classic', 'minimal', 'academic', 'linen')),
  accent_color text not null default '#0f6b4f' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  exam_label text not null default '' check (char_length(exam_label) <= 80),
  target_date date,
  position integer not null default 0,
  category_count integer not null default 0 check (category_count >= 0),
  entry_count integer not null default 0 check (entry_count >= 0),
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.factbook_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null,
  parent_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 140),
  icon text not null default 'folder',
  color text not null default '#0f6b4f' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  position integer not null default 0,
  entry_count integer not null default 0 check (entry_count >= 0),
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint factbook_categories_subject_owner_fk
    foreign key (subject_id, user_id) references public.factbook_subjects(id, user_id) on delete cascade,
  constraint factbook_categories_parent_owner_fk
    foreign key (parent_id, user_id) references public.factbook_categories(id, user_id) on delete restrict,
  constraint factbook_category_not_self_parent check (parent_id is null or parent_id <> id)
);

create table if not exists public.factbook_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null,
  category_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 220),
  entry_type text not null check (entry_type in (
    'fact', 'statistic', 'quotation', 'definition', 'case-study', 'report-index',
    'legal-provision', 'event', 'timeline', 'comparison', 'custom-table',
    'argument', 'cause-effect', 'problem-solution', 'book-note', 'media', 'rich-note'
  )),
  content jsonb not null default '{}'::jsonb check (octet_length(content::text) <= 1500000),
  importance text not null default 'normal' check (importance in ('normal', 'important', 'very-important', 'must-revise')),
  revision_status text not null default 'not-reviewed' check (revision_status in ('not-reviewed', 'learning', 'revised-once', 'well-prepared')),
  bookmarked boolean not null default false,
  source_count integer not null default 0 check (source_count >= 0),
  personal_remarks text not null default '' check (char_length(personal_remarks) <= 10000),
  search_text text not null default '',
  position integer not null default 0,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint factbook_entries_subject_owner_fk
    foreign key (subject_id, user_id) references public.factbook_subjects(id, user_id) on delete cascade,
  constraint factbook_entries_category_owner_fk
    foreign key (category_id, user_id) references public.factbook_categories(id, user_id) on delete restrict
);

create table if not exists public.factbook_entry_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null,
  block_type text not null check (block_type in ('heading', 'paragraph', 'list', 'quote', 'divider', 'image', 'table', 'rich-text')),
  content jsonb not null default '{}'::jsonb check (octet_length(content::text) <= 500000),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint factbook_blocks_entry_owner_fk
    foreign key (entry_id, user_id) references public.factbook_entries(id, user_id) on delete cascade
);

create table if not exists public.factbook_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null,
  title text not null default '' check (char_length(title) <= 300),
  author_organization text not null default '' check (char_length(author_organization) <= 240),
  publication_year text not null default '' check (char_length(publication_year) <= 40),
  page_number text not null default '' check (char_length(page_number) <= 60),
  web_address text not null default '' check (char_length(web_address) <= 2048),
  accessed_on date,
  verification_note text not null default '' check (char_length(verification_note) <= 2000),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint factbook_sources_entry_owner_fk
    foreign key (entry_id, user_id) references public.factbook_entries(id, user_id) on delete cascade
);

create table if not exists public.factbook_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  color text not null default '#0f6b4f' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index if not exists factbook_tags_user_lower_name_uidx
  on public.factbook_tags (user_id, lower(name));

create table if not exists public.factbook_entry_tags (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (entry_id, tag_id),
  constraint factbook_entry_tags_entry_owner_fk
    foreign key (entry_id, user_id) references public.factbook_entries(id, user_id) on delete cascade,
  constraint factbook_entry_tags_tag_owner_fk
    foreign key (tag_id, user_id) references public.factbook_tags(id, user_id) on delete cascade
);

create table if not exists public.factbook_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  color text not null default '#b8861f' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  position integer not null default 0,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.factbook_collection_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid not null,
  entry_id uuid not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, entry_id),
  constraint factbook_collection_entries_collection_owner_fk
    foreign key (collection_id, user_id) references public.factbook_collections(id, user_id) on delete cascade,
  constraint factbook_collection_entries_entry_owner_fk
    foreign key (entry_id, user_id) references public.factbook_entries(id, user_id) on delete cascade
);

create table if not exists public.factbook_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid,
  storage_path text not null check (char_length(storage_path) <= 900),
  file_name text not null check (char_length(file_name) <= 240),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  byte_size integer not null check (byte_size between 1 and 5242880),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  caption text not null default '' check (char_length(caption) <= 1000),
  alt_text text not null default '' check (char_length(alt_text) <= 500),
  source text not null default '' check (char_length(source) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint factbook_media_entry_owner_fk
    foreign key (entry_id, user_id) references public.factbook_entries(id, user_id) on delete cascade
);

create table if not exists public.factbook_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null,
  snapshot jsonb not null check (octet_length(snapshot::text) <= 1800000),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  constraint factbook_revisions_entry_owner_fk
    foreign key (entry_id, user_id) references public.factbook_entries(id, user_id) on delete cascade
);

create table if not exists public.factbook_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_view text not null default 'cards' check (default_view in ('cards', 'compact', 'book', 'revision', 'focus')),
  default_print_layout text not null default 'standard' check (default_print_layout in ('compact', 'standard', 'spacious')),
  source_reminders boolean not null default true,
  autosave_enabled boolean not null default true,
  revision_labels boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_factbook_subjects_user_position
  on public.factbook_subjects (user_id, position, updated_at desc) where deleted_at is null;
create index if not exists idx_factbook_categories_subject_parent_position
  on public.factbook_categories (user_id, subject_id, parent_id, position) where deleted_at is null;
create index if not exists idx_factbook_entries_subject_category_position
  on public.factbook_entries (user_id, subject_id, category_id, position) where deleted_at is null;
create index if not exists idx_factbook_entries_user_updated
  on public.factbook_entries (user_id, updated_at desc) where deleted_at is null;
create index if not exists idx_factbook_entries_user_bookmarked
  on public.factbook_entries (user_id, bookmarked, updated_at desc) where deleted_at is null and bookmarked;
create index if not exists idx_factbook_entries_search_trgm
  on public.factbook_entries using gin (search_text gin_trgm_ops);
create index if not exists idx_factbook_blocks_entry_position
  on public.factbook_entry_blocks (user_id, entry_id, position);
create index if not exists idx_factbook_sources_entry_position
  on public.factbook_sources (user_id, entry_id, position);
create index if not exists idx_factbook_collections_user_position
  on public.factbook_collections (user_id, position) where deleted_at is null;
create index if not exists idx_factbook_collection_entries_entry
  on public.factbook_collection_entries (user_id, entry_id);
create index if not exists idx_factbook_revisions_entry_created
  on public.factbook_revisions (user_id, entry_id, created_at desc);
create index if not exists idx_factbook_media_entry
  on public.factbook_media (user_id, entry_id);

create or replace function public.factbook_prevent_category_cycle()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_id is null then return new; end if;
  if new.parent_id = new.id then raise exception 'A category cannot contain itself.'; end if;
  if not exists (
    select 1 from public.factbook_categories parent
    where parent.id = new.parent_id and parent.user_id = new.user_id and parent.subject_id = new.subject_id
  ) then
    raise exception 'A subcategory must stay inside its own subject.';
  end if;
  if exists (
    with recursive descendants as (
      select id from public.factbook_categories where parent_id = new.id and user_id = new.user_id
      union all
      select child.id from public.factbook_categories child
      join descendants parent on child.parent_id = parent.id
      where child.user_id = new.user_id
    )
    select 1 from descendants where id = new.parent_id
  ) then
    raise exception 'A category cannot be moved inside one of its descendants.';
  end if;
  return new;
end;
$$;

drop trigger if exists factbook_categories_prevent_cycle on public.factbook_categories;
create trigger factbook_categories_prevent_cycle
before insert or update of parent_id on public.factbook_categories
for each row execute function public.factbook_prevent_category_cycle();

create or replace function public.factbook_prepare_entry()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.category_id is not null and not exists (
    select 1 from public.factbook_categories category_row
    where category_row.id = new.category_id and category_row.user_id = new.user_id and category_row.subject_id = new.subject_id
  ) then
    raise exception 'An entry category must belong to the selected subject.';
  end if;
  new.search_text := lower(concat_ws(
    ' ', new.title, new.entry_type, new.content::text, new.personal_remarks,
    (select string_agg(concat_ws(' ', title, author_organization, publication_year, page_number, verification_note), ' ') from public.factbook_sources where entry_id = new.id and user_id = new.user_id),
    (select string_agg(tag.name, ' ') from public.factbook_entry_tags relation join public.factbook_tags tag on tag.id = relation.tag_id and tag.user_id = relation.user_id where relation.entry_id = new.id and relation.user_id = new.user_id),
    (select string_agg(concat_ws(' ', caption, alt_text, source), ' ') from public.factbook_media where entry_id = new.id and user_id = new.user_id)
  ));
  return new;
end;
$$;

drop trigger if exists factbook_entries_prepare on public.factbook_entries;
create trigger factbook_entries_prepare
before insert or update of title, entry_type, content, personal_remarks, subject_id, category_id on public.factbook_entries
for each row execute function public.factbook_prepare_entry();

create or replace function public.factbook_refresh_entry_search()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  target_entry uuid;
begin
  if tg_op = 'DELETE' then owner := old.user_id; target_entry := old.entry_id;
  else owner := new.user_id; target_entry := new.entry_id;
  end if;
  update public.factbook_entries entry_row set
    source_count = (select count(*) from public.factbook_sources source_row where source_row.user_id = owner and source_row.entry_id = target_entry),
    search_text = lower(concat_ws(
      ' ', entry_row.title, entry_row.entry_type, entry_row.content::text, entry_row.personal_remarks,
      (select string_agg(concat_ws(' ', title, author_organization, publication_year, page_number, verification_note), ' ') from public.factbook_sources where entry_id = target_entry and user_id = owner),
      (select string_agg(tag.name, ' ') from public.factbook_entry_tags relation join public.factbook_tags tag on tag.id = relation.tag_id and tag.user_id = relation.user_id where relation.entry_id = target_entry and relation.user_id = owner),
      (select string_agg(concat_ws(' ', caption, alt_text, source), ' ') from public.factbook_media where entry_id = target_entry and user_id = owner)
    )),
    updated_at = entry_row.updated_at
  where entry_row.id = target_entry and entry_row.user_id = owner;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists factbook_sources_refresh_search on public.factbook_sources;
create trigger factbook_sources_refresh_search
after insert or update or delete on public.factbook_sources
for each row execute function public.factbook_refresh_entry_search();

drop trigger if exists factbook_entry_tags_refresh_search on public.factbook_entry_tags;
create trigger factbook_entry_tags_refresh_search
after insert or update or delete on public.factbook_entry_tags
for each row execute function public.factbook_refresh_entry_search();

drop trigger if exists factbook_media_refresh_search on public.factbook_media;
create trigger factbook_media_refresh_search
after insert or update or delete on public.factbook_media
for each row execute function public.factbook_refresh_entry_search();

create or replace function public.factbook_capture_revision()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if row(old.title, old.entry_type, old.content, old.importance, old.revision_status, old.personal_remarks, old.subject_id, old.category_id)
     is distinct from
     row(new.title, new.entry_type, new.content, new.importance, new.revision_status, new.personal_remarks, new.subject_id, new.category_id) then
    insert into public.factbook_revisions (user_id, entry_id, snapshot)
    values (old.user_id, old.id, jsonb_build_object(
      'title', old.title,
      'entry_type', old.entry_type,
      'content', old.content,
      'importance', old.importance,
      'revision_status', old.revision_status,
      'personal_remarks', old.personal_remarks,
      'subject_id', old.subject_id,
      'category_id', old.category_id,
      'bookmarked', old.bookmarked,
      'updated_at', old.updated_at
    ));
    delete from public.factbook_revisions
    where id in (
      select id from public.factbook_revisions
      where entry_id = old.id and user_id = old.user_id
      order by created_at desc offset 30
    );
  end if;
  return new;
end;
$$;

drop trigger if exists factbook_entries_capture_revision on public.factbook_entries;
create trigger factbook_entries_capture_revision
before update on public.factbook_entries
for each row execute function public.factbook_capture_revision();

create or replace function public.factbook_refresh_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  subject uuid;
  old_subject uuid;
  category uuid;
  old_category uuid;
begin
  if tg_op = 'DELETE' then
    owner := old.user_id;
    subject := old.subject_id;
  else
    owner := new.user_id;
    subject := new.subject_id;
  end if;
  if tg_op = 'UPDATE' then old_subject := old.subject_id; end if;
  if tg_table_name = 'factbook_entries' then
    if tg_op = 'DELETE' then category := old.category_id; else category := new.category_id; end if;
    if tg_op = 'UPDATE' then old_category := old.category_id; end if;
  end if;

  update public.factbook_subjects subject_row set
    category_count = (select count(*) from public.factbook_categories c where c.user_id = owner and c.subject_id = subject_row.id and c.deleted_at is null),
    entry_count = (select count(*) from public.factbook_entries e where e.user_id = owner and e.subject_id = subject_row.id and e.deleted_at is null),
    updated_at = now()
  where subject_row.user_id = owner and subject_row.id in (subject, old_subject);

  update public.factbook_categories category_row set
    entry_count = (select count(*) from public.factbook_entries e where e.user_id = owner and e.category_id = category_row.id and e.deleted_at is null),
    updated_at = now()
  where category_row.user_id = owner and category_row.id in (category, old_category);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists factbook_categories_refresh_counts on public.factbook_categories;
create trigger factbook_categories_refresh_counts
after insert or update of subject_id, deleted_at or delete on public.factbook_categories
for each row execute function public.factbook_refresh_counts();

drop trigger if exists factbook_entries_refresh_counts on public.factbook_entries;
create trigger factbook_entries_refresh_counts
after insert or update of subject_id, category_id, deleted_at or delete on public.factbook_entries
for each row execute function public.factbook_refresh_counts();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'factbook_subjects', 'factbook_categories', 'factbook_entries', 'factbook_entry_blocks',
    'factbook_sources', 'factbook_tags', 'factbook_collections', 'factbook_media', 'factbook_preferences'
  ] loop
    execute format('drop trigger if exists %I_touch_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_name, table_name);
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'factbook_subjects', 'factbook_categories', 'factbook_entries', 'factbook_entry_blocks',
    'factbook_sources', 'factbook_tags', 'factbook_entry_tags', 'factbook_collections',
    'factbook_collection_entries', 'factbook_media', 'factbook_revisions', 'factbook_preferences'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "Students manage own %s" on public.%I', table_name, table_name);
    execute format(
      'create policy "Students manage own %s" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name, table_name
    );
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
  end loop;
end $$;

create or replace function public.delete_my_factbook_data(confirm_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required.'; end if;
  if confirm_text <> 'DELETE MY FACTBOOK' then raise exception 'Confirmation text does not match.'; end if;
  delete from public.factbook_subjects where user_id = (select auth.uid());
  delete from public.factbook_collections where user_id = (select auth.uid());
  delete from public.factbook_tags where user_id = (select auth.uid());
  delete from public.factbook_preferences where user_id = (select auth.uid());
end;
$$;

revoke all on function public.delete_my_factbook_data(text) from public, anon;
grant execute on function public.delete_my_factbook_data(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'factbook-media', 'factbook-media', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Students read own factbook media" on storage.objects;
create policy "Students read own factbook media"
on storage.objects for select to authenticated
using (bucket_id = 'factbook-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Students upload own factbook media" on storage.objects;
create policy "Students upload own factbook media"
on storage.objects for insert to authenticated
with check (bucket_id = 'factbook-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Students update own factbook media" on storage.objects;
create policy "Students update own factbook media"
on storage.objects for update to authenticated
using (bucket_id = 'factbook-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'factbook-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Students delete own factbook media" on storage.objects;
create policy "Students delete own factbook media"
on storage.objects for delete to authenticated
using (bucket_id = 'factbook-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

analyze public.factbook_subjects;
analyze public.factbook_categories;
analyze public.factbook_entries;
analyze public.factbook_revisions;
