-- Doppelwort production data model for Supabase Postgres 15+
-- Apply with `supabase db push`. Role assignment and word selection remain service-only.

create extension if not exists pgcrypto;

create table public.guests (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 28),
  locale text not null default 'de' check (locale in ('de', 'en')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{4,6}$'),
  name text not null check (char_length(name) between 1 and 48),
  host_guest_id uuid not null references public.guests(id),
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'complete', 'locked', 'closed')),
  password_hash text,
  options jsonb not null,
  max_players smallint not null check (max_players between 3 and 12),
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint rooms_options_object check (jsonb_typeof(options) = 'object')
);

create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  member_type text not null default 'player' check (member_type in ('player', 'spectator')),
  connection_status text not null default 'online' check (connection_status in ('online', 'reconnecting', 'offline', 'kicked')),
  score integer not null default 0,
  joined_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (room_id, guest_id)
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  status text not null default 'playing' check (status in ('playing', 'complete', 'cancelled')),
  planned_rounds smallint not null check (planned_rounds between 1 and 20),
  current_round smallint not null default 1 check (current_round between 1 and 20),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index games_one_active_per_room_idx
  on public.games (room_id)
  where status = 'playing';

create table public.word_pairs (
  id uuid primary key default gen_random_uuid(),
  language text not null check (language in ('de', 'en')),
  category text not null check (category in ('animals', 'food', 'vehicles', 'sports', 'jobs', 'nature')),
  crew_word text not null check (char_length(crew_word) between 1 and 80),
  imposter_word text not null check (char_length(imposter_word) between 1 and 80),
  hint text check (char_length(hint) <= 120),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (language, crew_word, imposter_word),
  check (lower(crew_word) <> lower(imposter_word))
);

create index word_pairs_rotation_idx
  on public.word_pairs (language, category, id)
  where enabled = true;

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 20),
  phase text not null default 'reveal' check (phase in ('reveal', 'speaking', 'meeting', 'voting', 'result', 'complete')),
  word_pair_id uuid not null references public.word_pairs(id),
  speaking_order uuid[] not null,
  current_speaker_index smallint not null default 0,
  revealed_count smallint not null default 0,
  phase_started_at timestamptz not null default now(),
  phase_ends_at timestamptz,
  -- Contains assignments and both words. No client role receives SELECT on this table.
  private_payload jsonb not null,
  public_result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (game_id, round_number),
  constraint rounds_private_payload_object check (jsonb_typeof(private_payload) = 'object'),
  constraint rounds_public_result_object check (public_result is null or jsonb_typeof(public_result) = 'object')
);

create index rounds_room_created_idx on public.rounds (room_id, created_at desc);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  voter_guest_id uuid not null references public.guests(id) on delete cascade,
  target_guest_ids uuid[] not null default '{}',
  submitted_at timestamptz not null default now(),
  unique (round_id, voter_guest_id)
);

create index votes_round_idx on public.votes (round_id);

create table public.room_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  revision bigint not null,
  event_type text not null,
  public_payload jsonb not null default '{}',
  recipient_guest_id uuid references public.guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (room_id, revision, event_type, recipient_guest_id),
  constraint room_events_payload_object check (jsonb_typeof(public_payload) = 'object')
);

create index room_events_stream_idx on public.room_events (room_id, revision);
create index room_events_recipient_idx on public.room_events (recipient_guest_id, created_at desc)
  where recipient_guest_id is not null;

create table public.room_actions (
  room_id uuid not null references public.rooms(id) on delete cascade,
  action_id uuid not null,
  guest_id uuid not null references public.guests(id) on delete cascade,
  action_type text not null,
  resulting_revision bigint not null,
  created_at timestamptz not null default now(),
  primary key (room_id, action_id)
);

create index room_actions_cleanup_idx on public.room_actions (created_at);

create table public.bans (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete cascade,
  fingerprint_hash text,
  reason text not null check (char_length(reason) between 1 and 500),
  created_by uuid not null references public.guests(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  check (guest_id is not null or fingerprint_hash is not null)
);

create index bans_active_guest_idx on public.bans (guest_id, expires_at)
  where revoked_at is null;
create index bans_room_idx on public.bans (room_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete set null,
  reporter_guest_id uuid references public.guests(id) on delete set null,
  reported_guest_id uuid references public.guests(id) on delete set null,
  category text not null check (category in ('name', 'harassment', 'spam', 'cheating', 'other')),
  description text check (char_length(description) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index reports_queue_idx on public.reports (status, created_at);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('moderator', 'admin', 'owner')),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint audit_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index audit_logs_room_created_idx on public.audit_logs (room_id, created_at desc);
create index audit_logs_actor_created_idx on public.audit_logs (actor_id, created_at desc);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.admin_users(user_id),
  updated_at timestamptz not null default now()
);

create index rooms_public_lobby_idx on public.rooms (updated_at desc)
  where visibility = 'public' and status = 'lobby';
create index rooms_host_guest_idx on public.rooms (host_guest_id);
create index games_room_idx on public.games (room_id);
create index room_members_guest_idx on public.room_members (guest_id, room_id);
create index room_members_heartbeat_idx on public.room_members (room_id, last_heartbeat_at)
  where connection_status <> 'kicked';
create index rounds_word_pair_idx on public.rounds (word_pair_id);
create index votes_voter_guest_idx on public.votes (voter_guest_id);
create index room_actions_guest_idx on public.room_actions (guest_id);
create index bans_guest_idx on public.bans (guest_id);
create index bans_created_by_idx on public.bans (created_by);
create index reports_room_idx on public.reports (room_id);
create index reports_reporter_idx on public.reports (reporter_guest_id);
create index reports_reported_idx on public.reports (reported_guest_id);
create index app_settings_updated_by_idx on public.app_settings (updated_by);

-- Security-definer membership helpers prevent recursive room_members policies.
create or replace function public.is_room_member(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.room_members
    where room_id = target_room_id
      and guest_id = (select auth.uid())
      and connection_status <> 'kicked'
  );
$$;

create or replace function public.is_admin(minimum_role text default 'moderator')
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
      and case minimum_role
        when 'owner' then role = 'owner'
        when 'admin' then role in ('admin', 'owner')
        else role in ('moderator', 'admin', 'owner')
      end
  );
$$;

revoke all on function public.is_room_member(uuid) from public;
revoke all on function public.is_admin(text) from public;
grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.is_admin(text) to authenticated;

alter table public.guests enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.games enable row level security;
alter table public.word_pairs enable row level security;
alter table public.rounds enable row level security;
alter table public.votes enable row level security;
alter table public.room_events enable row level security;
alter table public.room_actions enable row level security;
alter table public.bans enable row level security;
alter table public.reports enable row level security;
alter table public.admin_users enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;

create policy guests_read_self on public.guests for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy guests_insert_self on public.guests for insert to authenticated with check (id = (select auth.uid()));
create policy guests_update_self on public.guests for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Regular clients never select rooms directly because that row also contains password_hash.
-- Public metadata uses the deliberately narrow view below; member snapshots come from an Edge Function.
create policy rooms_read_admin on public.rooms for select to authenticated using ((select public.is_admin()));
create policy room_members_read_room on public.room_members for select to authenticated
  using (guest_id = (select auth.uid()) or public.is_room_member(room_id) or (select public.is_admin()));
create policy games_read_member on public.games for select to authenticated
  using (public.is_room_member(room_id) or (select public.is_admin()));
create policy room_events_read_member on public.room_events for select to authenticated
  using (
    (public.is_room_member(room_id) and (recipient_guest_id is null or recipient_guest_id = (select auth.uid())))
    or (select public.is_admin())
  );

create policy reports_insert_member on public.reports for insert to authenticated
  with check (reporter_guest_id = (select auth.uid()) and (room_id is null or public.is_room_member(room_id)));
create policy reports_read_own_or_admin on public.reports for select to authenticated
  using (reporter_guest_id = (select auth.uid()) or (select public.is_admin()));

create policy admins_read_self_or_admin on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin('admin')));
create policy audit_read_admin on public.audit_logs for select to authenticated using ((select public.is_admin()));
create policy settings_read_admin on public.app_settings for select to authenticated using ((select public.is_admin()));

-- Browser clients receive only the privileges backed by the policies above.
revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update on public.guests to authenticated;
grant select on public.rooms, public.room_members, public.games, public.room_events to authenticated;
grant select, insert on public.reports to authenticated;
grant select on public.admin_users, public.audit_logs, public.app_settings to authenticated;

-- The client may read sanitized room metadata, never password hashes or options containing secrets.
create view public.public_room_directory with (security_barrier = true) as
select
  r.id,
  r.code,
  r.name,
  r.status,
  r.max_players,
  r.password_hash is not null as password_protected,
  r.options ->> 'language' as language,
  r.options ->> 'category' as category,
  count(rm.guest_id) filter (where rm.member_type = 'player' and rm.left_at is null) as player_count,
  r.updated_at
from public.rooms r
left join public.room_members rm on rm.room_id = r.id
where r.visibility = 'public' and r.status = 'lobby'
group by r.id;

grant select on public.public_room_directory to authenticated;
comment on view public.public_room_directory is 'Security-definer projection: exposes only safe public lobby metadata.';

-- Atomic, idempotent host phase transition. Complex role assignment, player-owned
-- speaking completion and scoring use equivalent service-only RPCs/Edge Functions.
create or replace function public.transition_round_phase(
  p_room_id uuid,
  p_round_id uuid,
  p_action_id uuid,
  p_expected_revision bigint,
  p_from_phase text,
  p_to_phase text,
  p_phase_ends_at timestamptz default null
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
  v_revision bigint;
  v_current_phase text;
  v_duration_seconds integer;
  v_phase_ends_at timestamptz;
begin
  if not public.is_room_member(p_room_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_room_id::text, 0));

  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found' using errcode = 'P0002'; end if;
  if v_room.host_guest_id <> (select auth.uid()) then
    raise exception 'host_required' using errcode = '42501';
  end if;

  select resulting_revision into v_revision
  from public.room_actions where room_id = p_room_id and action_id = p_action_id;
  if found then return v_revision; end if;

  if v_room.revision <> p_expected_revision then
    raise exception 'revision_conflict' using errcode = '40001';
  end if;

  select r.phase into v_current_phase
  from public.rounds r
  join public.games g on g.id = r.game_id and g.room_id = p_room_id and g.status = 'playing'
  where r.id = p_round_id and r.room_id = p_room_id
  for update of r;
  if not found then raise exception 'active_round_not_found' using errcode = 'P0002'; end if;
  if v_current_phase <> p_from_phase then
    raise exception 'invalid_phase_transition' using errcode = '22023';
  end if;

  if not (
    (p_from_phase = 'reveal' and p_to_phase = 'speaking')
    or (p_from_phase = 'speaking' and p_to_phase = 'meeting')
    or (p_from_phase = 'meeting' and p_to_phase = 'voting')
    or (p_from_phase = 'voting' and p_to_phase = 'result')
    or (p_from_phase = 'result' and p_to_phase = 'complete')
  ) then
    raise exception 'transition_not_allowed' using errcode = '22023';
  end if;

  -- p_phase_ends_at remains in the signature for API compatibility but is never trusted.
  case p_to_phase
    when 'speaking' then
      v_duration_seconds := greatest(10, least(180, coalesce((v_room.options ->> 'speakingSeconds')::integer, 30)));
      v_phase_ends_at := now() + make_interval(secs => v_duration_seconds);
    when 'meeting' then
      v_duration_seconds := greatest(0, least(300, coalesce((v_room.options ->> 'meetingSeconds')::integer, 45)));
      v_phase_ends_at := case when v_duration_seconds = 0 then null else now() + make_interval(secs => v_duration_seconds) end;
    when 'voting' then
      v_duration_seconds := greatest(15, least(300, coalesce((v_room.options ->> 'votingSeconds')::integer, 45)));
      v_phase_ends_at := now() + make_interval(secs => v_duration_seconds);
    when 'result' then
      v_phase_ends_at := case when coalesce((v_room.options ->> 'autoNextRound')::boolean, false) then now() + interval '8 seconds' else null end;
    else
      v_phase_ends_at := null;
  end case;

  update public.rounds
  set phase = p_to_phase, phase_started_at = now(), phase_ends_at = v_phase_ends_at
  where id = p_round_id and room_id = p_room_id and phase = v_current_phase;
  if not found then raise exception 'invalid_phase_transition' using errcode = '22023'; end if;

  update public.rooms set revision = revision + 1, updated_at = now()
  where id = p_room_id returning revision into v_revision;

  insert into public.room_actions (room_id, action_id, guest_id, action_type, resulting_revision)
  values (p_room_id, p_action_id, (select auth.uid()), p_from_phase || '_to_' || p_to_phase, v_revision);

  insert into public.room_events (room_id, revision, event_type, public_payload)
  values (p_room_id, v_revision, 'phase_changed', jsonb_build_object('phase', p_to_phase, 'phaseEndsAt', v_phase_ends_at));

  return v_revision;
end;
$$;

revoke all on function public.transition_round_phase(uuid, uuid, uuid, bigint, text, text, timestamptz) from public;
grant execute on function public.transition_round_phase(uuid, uuid, uuid, bigint, text, text, timestamptz) to authenticated;

-- Realtime publishes sanitized events only. Add the table once to the publication.
alter publication supabase_realtime add table public.room_events;

comment on table public.rounds is 'Server-only round truth. Client subscriptions use room_events instead.';
comment on column public.rounds.private_payload is 'Role assignments and both words; service role only.';
comment on table public.room_actions is 'Idempotency keys and optimistic revision results for replay protection.';
