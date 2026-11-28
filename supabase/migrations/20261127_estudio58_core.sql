-- Estudio 58: core schema (HANDOFF.md section 14), Phase 3.
-- Payments stay demo-controlled until Phase 5: only the server (service role / Stripe webhook) writes subscriptions.

-- ---------- Types ----------
create type public.lang as enum ('en', 'es');
create type public.tier as enum ('academy', 'review', 'coaching');
create type public.level as enum ('beginner', 'intermediate', 'advanced');
create type public.content_type as enum ('technique', 'lesson', 'analysis', 'sparring', 'qa');
create type public.belt as enum ('white', 'blue', 'purple', 'brown', 'black', 'none');
create type public.pub_status as enum ('draft', 'published');
create type public.sub_status as enum ('none', 'active', 'past_due', 'paused', 'canceled');
create type public.app_role as enum ('admin');
create type public.request_type as enum ('question', 'review', 'call', 'private');
create type public.request_status as enum ('new', 'in_progress', 'answered', 'declined');
create type public.request_privacy as enum ('private', 'public');
create type public.reply_kind as enum ('text', 'video', 'lesson');
create type public.notice_kind as enum ('reply', 'waitlist', 'billing');

-- ---------- People ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  first_name text not null default '',
  lang public.lang not null default 'en',
  belt public.belt not null default 'none',
  interests text[] not null default '{}',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Written only by the server (Stripe webhook from Phase 5). Members can read their own row.
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier public.tier,
  status public.sub_status not null default 'none',
  period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  pending_tier public.tier,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  updated_at timestamptz not null default now()
);

create table public.waitlist (
  user_id uuid primary key references auth.users (id) on delete cascade,
  invited boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Helper functions (run with owner rights so policies can use them safely) ----------
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles r where r.user_id = uid and r.role = 'admin');
$$;

-- Paid access: active, or past_due during Stripe's retry period. Admins always.
create or replace function public.active_tier(uid uuid default auth.uid())
returns public.tier language sql stable security definer set search_path = '' as $$
  select case
    when public.is_admin(uid) then 'coaching'::public.tier
    else (select s.tier from public.subscriptions s
          where s.user_id = uid and s.tier is not null and s.status in ('active', 'past_due'))
  end;
$$;

create or replace function public.has_access(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.active_tier(uid) is not null;
$$;

-- ---------- Content ----------
create table public.categories (
  id text primary key,
  name_en text not null,
  name_es text not null,
  sort int not null default 0
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  category_id text references public.categories (id) on delete set null,
  level public.level not null default 'beginner',
  type public.content_type not null default 'technique',
  status public.pub_status not null default 'draft',
  featured boolean not null default false,
  thumbnail_path text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per recorded language. A video missing a language is hidden from that library.
create table public.video_versions (
  video_id uuid not null references public.videos (id) on delete cascade,
  lang public.lang not null,
  title text not null,
  description text not null default '',
  duration_sec int not null default 0 check (duration_sec >= 0),
  primary key (video_id, lang)
);

-- Protected playback info: never readable by members. A server function signs short-lived links (Phase 6).
create table public.video_assets (
  video_id uuid not null references public.videos (id) on delete cascade,
  lang public.lang not null,
  provider text not null default 'mux',
  asset_id text,
  playback_id text,
  subtitles_path text,
  created_at timestamptz not null default now(),
  primary key (video_id, lang)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  level public.level not null default 'beginner',
  status public.pub_status not null default 'draft',
  cover_path text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_versions (
  course_id uuid not null references public.courses (id) on delete cascade,
  lang public.lang not null,
  title text not null,
  description text not null default '',
  primary key (course_id, lang)
);

create table public.course_lessons (
  course_id uuid not null references public.courses (id) on delete cascade,
  lang public.lang not null,
  position int not null check (position >= 0),
  video_id uuid not null references public.videos (id) on delete cascade,
  primary key (course_id, lang, position),
  unique (course_id, lang, video_id)
);

-- ---------- Member activity ----------
create table public.watch_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  position_sec int not null default 0 check (position_sec >= 0),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table public.bookmarks (
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

-- ---------- Ask JLM ----------
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.request_type not null,
  lang public.lang not null,
  privacy public.request_privacy not null default 'private',
  public_approved boolean not null default false,
  status public.request_status not null default 'new',
  subject text not null check (char_length(subject) between 1 and 200),
  body text not null check (char_length(body) between 1 and 5000),
  link text check (link is null or char_length(link) <= 1000),
  video_id uuid references public.videos (id) on delete set null,
  preferred_time text check (preferred_time is null or char_length(preferred_time) <= 200),
  paid_one_off boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index requests_user_created_idx on public.requests (user_id, created_at desc);
create index requests_status_idx on public.requests (status, created_at desc);

create table public.request_replies (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  kind public.reply_kind not null,
  body text not null default '',
  link text,
  lesson_video_id uuid references public.videos (id) on delete set null,
  created_at timestamptz not null default now()
);
create index request_replies_request_idx on public.request_replies (request_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.notice_kind not null,
  request_id uuid references public.requests (id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------- Site settings (single row, editable in /admin) ----------
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- Automatic profile on sign-up ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, first_name, lang)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'first_name', ''), 100),
    case when new.raw_user_meta_data ->> 'lang' = 'es' then 'es'::public.lang else 'en'::public.lang end
  );
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger videos_touch before update on public.videos for each row execute function public.touch_updated_at();
create trigger courses_touch before update on public.courses for each row execute function public.touch_updated_at();
create trigger requests_touch before update on public.requests for each row execute function public.touch_updated_at();

-- ---------- Ask JLM: create a request with tier limits checked on the server ----------
create or replace function public.create_request(
  p_type public.request_type,
  p_lang public.lang,
  p_privacy public.request_privacy,
  p_subject text,
  p_body text,
  p_link text default null,
  p_video_id uuid default null,
  p_preferred_time text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  t public.tier;
  lim int;
  used int;
  since timestamptz;
  settings jsonb;
  new_id uuid;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  t := public.active_tier(uid);
  if t is null then raise exception 'not_allowed' using errcode = '42501'; end if;

  if p_type <> 'private' then
    select s.data into settings from public.site_settings s where s.id = 1;
    if p_type = 'question' then
      lim := coalesce((settings -> 'limits' -> t::text ->> 'questionsPerMonth')::int, 0);
      since := date_trunc('month', now() at time zone 'Europe/Dublin') at time zone 'Europe/Dublin';
    elsif p_type = 'review' then
      lim := coalesce((settings -> 'limits' -> t::text ->> 'reviewsPerMonth')::int, 0);
      since := date_trunc('month', now() at time zone 'Europe/Dublin') at time zone 'Europe/Dublin';
    else -- call
      lim := coalesce((settings -> 'limits' -> t::text ->> 'callsPerWeek')::int, 0);
      since := date_trunc('week', now() at time zone 'Europe/Dublin') at time zone 'Europe/Dublin';
    end if;

    select count(*) into used from public.requests r
      where r.user_id = uid and r.type = p_type and not r.paid_one_off
        and r.created_at >= since and (p_type <> 'call' or r.status <> 'declined');

    if lim <= 0 or used >= lim then raise exception 'limit_reached' using errcode = 'P0001'; end if;
  end if;

  insert into public.requests (user_id, type, lang, privacy, subject, body, link, video_id, preferred_time)
  values (uid, p_type, p_lang, p_privacy, p_subject, p_body, p_link, p_video_id, p_preferred_time)
  returning id into new_id;
  return new_id;
end;
$$;

-- Coaching places used (shown on the public membership page; no personal data).
create or replace function public.coaching_places_used()
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.subscriptions s
  where s.tier = 'coaching' and s.status in ('active', 'past_due')
    and not public.is_admin(s.user_id);
$$;

-- ---------- Row-level security ----------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.waitlist enable row level security;
alter table public.categories enable row level security;
alter table public.videos enable row level security;
alter table public.video_versions enable row level security;
alter table public.video_assets enable row level security;
alter table public.courses enable row level security;
alter table public.course_versions enable row level security;
alter table public.course_lessons enable row level security;
alter table public.watch_progress enable row level security;
alter table public.bookmarks enable row level security;
alter table public.requests enable row level security;
alter table public.request_replies enable row level security;
alter table public.notifications enable row level security;
alter table public.site_settings enable row level security;

-- Profiles: own row, admin reads all. Members may change only name, language, belt, interests.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update (first_name, lang, belt, interests) on public.profiles to authenticated;

-- Roles: you can see your own; nobody can grant roles from the website.
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- Subscriptions: read-only from the website (own row, or admin).
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- Waitlist: join yourself, see yourself; admin sees all and marks invites.
create policy waitlist_select on public.waitlist for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy waitlist_insert on public.waitlist for insert to authenticated
  with check (user_id = (select auth.uid()) and invited = false);
create policy waitlist_delete_own on public.waitlist for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy waitlist_admin_update on public.waitlist for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Categories: anyone can read names; admin edits.
create policy categories_select on public.categories for select to anon, authenticated using (true);
create policy categories_admin on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Videos and courses: paying members read published; admin manages everything.
create policy videos_select on public.videos for select to authenticated
  using (public.is_admin() or (status = 'published' and public.has_access()));
create policy videos_admin on public.videos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy video_versions_select on public.video_versions for select to authenticated
  using (public.is_admin() or (public.has_access() and exists (
    select 1 from public.videos v where v.id = video_id and v.status = 'published')));
create policy video_versions_admin on public.video_versions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy video_assets_admin on public.video_assets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy courses_select on public.courses for select to authenticated
  using (public.is_admin() or (status = 'published' and public.has_access()));
create policy courses_admin on public.courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy course_versions_select on public.course_versions for select to authenticated
  using (public.is_admin() or (public.has_access() and exists (
    select 1 from public.courses c where c.id = course_id and c.status = 'published')));
create policy course_versions_admin on public.course_versions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy course_lessons_select on public.course_lessons for select to authenticated
  using (public.is_admin() or (public.has_access() and exists (
    select 1 from public.courses c where c.id = course_id and c.status = 'published')));
create policy course_lessons_admin on public.course_lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Progress and bookmarks: strictly your own.
create policy progress_own on public.watch_progress for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy progress_admin_read on public.watch_progress for select to authenticated
  using (public.is_admin());
create policy bookmarks_own on public.bookmarks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Requests: your own; approved public ones (members with access only); admin all.
-- New requests only through create_request() so limits can't be skipped.
create policy requests_select on public.requests for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_admin()
    or (privacy = 'public' and public_approved and public.has_access())
  );
create policy requests_admin_update on public.requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy requests_admin_delete on public.requests for delete to authenticated
  using (public.is_admin());

create policy replies_select on public.request_replies for select to authenticated
  using (exists (
    select 1 from public.requests r where r.id = request_id and (
      r.user_id = (select auth.uid())
      or public.is_admin()
      or (r.privacy = 'public' and r.public_approved and public.has_access()))));
create policy replies_admin on public.request_replies for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Notifications: read and mark-as-read your own; admin creates them.
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.notifications from authenticated, anon;
grant update (read) on public.notifications to authenticated;
create policy notifications_admin_insert on public.notifications for insert to authenticated
  with check (public.is_admin());

-- Site settings: public read (prices, bio, FAQ shown on public pages); admin edits.
create policy site_settings_select on public.site_settings for select to anon, authenticated using (true);
create policy site_settings_admin on public.site_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Function access
revoke execute on function public.create_request(public.request_type, public.lang, public.request_privacy, text, text, text, uuid, text) from public, anon;
grant execute on function public.create_request(public.request_type, public.lang, public.request_privacy, text, text, text, uuid, text) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.coaching_places_used() to anon, authenticated;

-- ---------- Starting data ----------
insert into public.categories (id, name_en, name_es, sort) values
  ('guard-passing', 'Guard Passing', 'Pasaje de guardia', 1),
  ('guard-retention', 'Guard Retention', 'Retención de guardia', 2),
  ('open-guard', 'Open Guard', 'Guardia abierta', 3),
  ('half-guard', 'Half Guard', 'Media guardia', 4),
  ('takedowns', 'Takedowns and Wrestling', 'Derribos y lucha', 5),
  ('submissions', 'Submissions', 'Sumisiones', 6),
  ('leg-locks', 'Leg Locks', 'Llaves de pierna', 7),
  ('back-control', 'Back Control', 'Control de espalda', 8),
  ('escapes', 'Escapes and Defence', 'Escapes y defensa', 9),
  ('positional-control', 'Positional Control', 'Control posicional', 10),
  ('competition', 'Competition Strategy', 'Estrategia de competición', 11),
  ('sparring', 'Sparring Breakdowns', 'Análisis de sparring', 12),
  ('concepts', 'Training Concepts', 'Conceptos de entrenamiento', 13);

insert into public.site_settings (id, data) values (1, jsonb_build_object(
  'prices', jsonb_build_object('academy', 1299, 'review', 3699, 'coaching', 7399, 'oneOffQuestion', 1899),
  'limits', jsonb_build_object(
    'academy',  jsonb_build_object('questionsPerMonth', 0, 'reviewsPerMonth', 0, 'callsPerWeek', 0),
    'review',   jsonb_build_object('questionsPerMonth', 2, 'reviewsPerMonth', 2, 'callsPerWeek', 0),
    'coaching', jsonb_build_object('questionsPerMonth', 5, 'reviewsPerMonth', 5, 'callsPerWeek', 1)),
  'coachingPlaces', 10,
  'travelMode', false,
  'achievements', jsonb_build_array(
    jsonb_build_object('en', '2026 European No-Gi Champion', 'es', 'Campeón Europeo No-Gi 2026'),
    jsonb_build_object('en', '2025 European No-Gi Silver Medallist', 'es', 'Medalla de plata Europeo No-Gi 2025'),
    jsonb_build_object('en', '2024 European No-Gi Silver Medallist', 'es', 'Medalla de plata Europeo No-Gi 2024'),
    jsonb_build_object('en', '2024 ADCC Trials Medallist', 'es', 'Medallista ADCC Trials 2024'),
    jsonb_build_object('en', 'Polaris Champion and veteran', 'es', 'Campeón y veterano de Polaris'),
    jsonb_build_object('en', 'Multiple-time National Champion', 'es', 'Múltiple campeón nacional')),
  'bio', jsonb_build_object('en', '', 'es', ''),
  'philosophy', jsonb_build_object('en', '', 'es', ''),
  'instagram', 'https://www.instagram.com/jeanlucajj/',
  'ibjjf', 'https://ibjjf.com/athletes/jean-maltese',
  'heroHeadline', jsonb_build_object('en', 'TRAIN WITH PURPOSE. MASTER YOUR JIU JITSU.', 'es', 'ENTRENA CON PROPÓSITO. DOMINA TU JIU JITSU.'),
  'announcement', null,
  'faq', jsonb_build_array(),
  'logoName', null, 'heroImageName', null, 'portraitName', null
));

-- ===================== Part 2: lock helper functions =====================
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles r where r.user_id = uid and r.role = 'admin');
$$;

create or replace function private.active_tier(uid uuid)
returns public.tier language sql stable security definer set search_path = '' as $$
  select case
    when private.is_admin(uid) then 'coaching'::public.tier
    else (select s.tier from public.subscriptions s
          where s.user_id = uid and s.tier is not null and s.status in ('active', 'past_due'))
  end;
$$;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select uid is not null and uid = auth.uid() and private.is_admin(uid);
$$;

create or replace function public.active_tier(uid uuid default auth.uid())
returns public.tier language sql stable security definer set search_path = '' as $$
  select case when uid is not null and uid = auth.uid() then private.active_tier(uid) end;
$$;

create or replace function public.has_access(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select uid is not null and uid = auth.uid() and private.active_tier(uid) is not null;
$$;

create or replace function public.coaching_places_used()
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.subscriptions s
  where s.tier = 'coaching' and s.status in ('active', 'past_due')
    and not private.is_admin(s.user_id);
$$;

revoke execute on function public.is_admin(uuid) from public, anon;
revoke execute on function public.active_tier(uuid) from public, anon;
revoke execute on function public.has_access(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.active_tier(uuid) to authenticated;
grant execute on function public.has_access(uuid) to authenticated;
revoke execute on function private.is_admin(uuid) from public, anon, authenticated;
revoke execute on function private.active_tier(uuid) from public, anon, authenticated;

-- ===================== Part 3: table grants =====================
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
grant select on public.categories, public.site_settings to anon;
grant select on public.profiles, public.user_roles, public.subscriptions to authenticated;
grant select, insert, update, delete on public.waitlist to authenticated;
grant select, insert, update, delete on
  public.categories, public.videos, public.video_versions, public.video_assets,
  public.courses, public.course_versions, public.course_lessons,
  public.watch_progress, public.bookmarks, public.request_replies to authenticated;
grant select, update, delete on public.requests to authenticated;
grant select, insert on public.notifications to authenticated;
grant select, update on public.site_settings to authenticated;
grant all on all tables in schema public to service_role;
grant usage on schema private to service_role;
grant execute on all functions in schema private to service_role;
