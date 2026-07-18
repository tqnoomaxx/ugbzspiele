-- Reusable UGBZ room transport for Doppelwort and future games.
-- The game-specific JSON state remains versioned by each game engine.

create extension if not exists pgcrypto;

create table public.platform_rooms (
  id uuid primary key default gen_random_uuid(),
  game_key text not null check (game_key ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  code text not null check (code ~ '^[A-HJ-NP-Z2-9]{4,6}$'),
  name text not null check (char_length(name) between 1 and 48),
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'complete', 'closed')),
  host_player_id text not null,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  max_players smallint not null check (max_players between 2 and 32),
  password_protected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (game_key, code)
);

create table public.platform_room_secrets (
  room_id uuid primary key references public.platform_rooms(id) on delete cascade,
  password_hash text
);

create table public.platform_room_members (
  room_id uuid not null references public.platform_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id text not null,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (room_id, user_id),
  unique (room_id, player_id)
);

create index platform_rooms_directory_idx
  on public.platform_rooms (game_key, updated_at desc)
  where visibility = 'public' and status = 'lobby';
create index platform_room_members_user_idx
  on public.platform_room_members (user_id, room_id)
  where left_at is null;
create index platform_rooms_cleanup_idx
  on public.platform_rooms (updated_at)
  where status in ('complete', 'closed');

create or replace function public.is_platform_room_member(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.platform_room_members
    where room_id = target_room_id
      and user_id = (select auth.uid())
      and left_at is null
  );
$$;

revoke all on function public.is_platform_room_member(uuid) from public;
grant execute on function public.is_platform_room_member(uuid) to authenticated;

alter table public.platform_rooms enable row level security;
alter table public.platform_room_secrets enable row level security;
alter table public.platform_room_members enable row level security;

create policy platform_rooms_read_directory_or_member
on public.platform_rooms for select to authenticated
using (
  (visibility = 'public' and status = 'lobby')
  or (select public.is_platform_room_member(id))
);

create policy platform_members_read_room
on public.platform_room_members for select to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_platform_room_member(room_id))
);

create or replace view public.platform_public_rooms as
select
  game_key,
  code,
  name,
  status,
  jsonb_array_length(coalesce(state -> 'players', '[]'::jsonb))::integer as player_count,
  max_players,
  coalesce(state #>> '{options,language}', 'de') as language,
  password_protected,
  updated_at
from public.platform_rooms
where visibility = 'public' and status = 'lobby';

create or replace function public.platform_create_room(
  p_game_key text,
  p_room_state jsonb,
  p_password text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room_id uuid;
  v_code text := upper(p_room_state ->> 'code');
  v_host_player_id text := p_room_state ->> 'hostId';
  v_revision bigint := coalesce((p_room_state ->> 'revision')::bigint, 1);
begin
  if (select auth.uid()) is null then raise exception 'SESSION_REQUIRED'; end if;
  if jsonb_typeof(p_room_state) <> 'object' then raise exception 'INVALID_STATE'; end if;
  if p_game_key !~ '^[a-z0-9][a-z0-9-]{1,39}$' then raise exception 'INVALID_GAME_KEY'; end if;
  if v_code !~ '^[A-HJ-NP-Z2-9]{4,6}$' then raise exception 'INVALID_CODE'; end if;
  if v_host_player_id is null then raise exception 'HOST_REQUIRED'; end if;

  insert into public.platform_rooms (
    game_key, code, name, visibility, status, host_player_id,
    state, revision, max_players, password_protected
  ) values (
    p_game_key,
    v_code,
    left(coalesce(nullif(p_room_state ->> 'name', ''), 'UGBZ Raum'), 48),
    coalesce(p_room_state ->> 'visibility', 'private'),
    coalesce(p_room_state ->> 'status', 'lobby'),
    v_host_player_id,
    p_room_state - 'password',
    v_revision,
    greatest(2, least(32, coalesce((p_room_state #>> '{options,maxPlayers}')::smallint, 8))),
    nullif(p_password, '') is not null
  )
  returning id into v_room_id;

  insert into public.platform_room_secrets (room_id, password_hash)
  values (
    v_room_id,
    case
      when nullif(p_password, '') is null then null
      else extensions.crypt(p_password, extensions.gen_salt('bf'))
    end
  );

  insert into public.platform_room_members (room_id, user_id, player_id)
  values (v_room_id, (select auth.uid()), v_host_player_id);

  return p_room_state - 'password';
exception
  when unique_violation then raise exception 'ROOM_CODE_TAKEN';
end;
$$;

create or replace function public.platform_join_room(
  p_game_key text,
  p_code text,
  p_player jsonb,
  p_password text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.platform_rooms%rowtype;
  v_password_hash text;
  v_players jsonb;
  v_state jsonb;
  v_revision bigint;
begin
  if (select auth.uid()) is null then raise exception 'SESSION_REQUIRED'; end if;
  if jsonb_typeof(p_player) <> 'object' then raise exception 'INVALID_PLAYER'; end if;
  if char_length(trim(p_player ->> 'name')) not between 1 and 28 then raise exception 'INVALID_NAME'; end if;

  select * into v_room
  from public.platform_rooms
  where game_key = p_game_key and code = upper(p_code)
  for update;

  if not found or v_room.status = 'closed' then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.status <> 'lobby' then raise exception 'ROOM_ALREADY_STARTED'; end if;

  select password_hash into v_password_hash
  from public.platform_room_secrets where room_id = v_room.id;
  if v_password_hash is not null
    and extensions.crypt(coalesce(p_password, ''), v_password_hash) <> v_password_hash
  then
    raise exception 'PASSWORD_INVALID';
  end if;

  v_players := coalesce(v_room.state -> 'players', '[]'::jsonb);
  if jsonb_array_length(v_players) >= v_room.max_players then raise exception 'ROOM_FULL'; end if;
  if exists (
    select 1 from jsonb_array_elements(v_players) player
    where lower(player ->> 'name') = lower(trim(p_player ->> 'name'))
  ) then raise exception 'NAME_TAKEN'; end if;

  v_revision := v_room.revision + 1;
  v_state := jsonb_set(v_room.state, '{players}', v_players || jsonb_build_array(p_player), true);
  v_state := jsonb_set(v_state, '{revision}', to_jsonb(v_revision), true);
  v_state := jsonb_set(v_state, '{updatedAt}', to_jsonb(now()), true);

  update public.platform_rooms
  set state = v_state, revision = v_revision, updated_at = now()
  where id = v_room.id;

  insert into public.platform_room_members (room_id, user_id, player_id)
  values (v_room.id, (select auth.uid()), p_player ->> 'id')
  on conflict (room_id, user_id) do update
  set player_id = excluded.player_id, left_at = null, last_seen_at = now();

  return v_state;
end;
$$;

create or replace function public.platform_update_room(
  p_game_key text,
  p_code text,
  p_expected_revision bigint,
  p_room_state jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.platform_rooms%rowtype;
  v_state jsonb;
  v_revision bigint;
begin
  select * into v_room
  from public.platform_rooms
  where game_key = p_game_key and code = upper(p_code)
  for update;

  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if not public.is_platform_room_member(v_room.id) then raise exception 'NOT_AUTHORIZED'; end if;
  if v_room.revision <> p_expected_revision then raise exception 'REVISION_CONFLICT'; end if;
  if jsonb_typeof(p_room_state) <> 'object' then raise exception 'INVALID_STATE'; end if;

  v_revision := v_room.revision + 1;
  v_state := p_room_state - 'password';
  v_state := jsonb_set(v_state, '{revision}', to_jsonb(v_revision), true);
  v_state := jsonb_set(v_state, '{updatedAt}', to_jsonb(now()), true);

  update public.platform_rooms
  set
    name = left(coalesce(nullif(v_state ->> 'name', ''), name), 48),
    visibility = coalesce(v_state ->> 'visibility', visibility),
    status = coalesce(v_state ->> 'status', status),
    host_player_id = coalesce(v_state ->> 'hostId', host_player_id),
    max_players = greatest(2, least(32, coalesce((v_state #>> '{options,maxPlayers}')::smallint, max_players))),
    state = v_state,
    revision = v_revision,
    updated_at = now()
  where id = v_room.id;

  return v_state;
end;
$$;

create or replace function public.platform_close_room(p_game_key text, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.platform_rooms%rowtype;
  v_player_id text;
begin
  select rooms.* into v_room
  from public.platform_rooms rooms
  join public.platform_room_members members on members.room_id = rooms.id
  where rooms.game_key = p_game_key
    and rooms.code = upper(p_code)
    and members.user_id = (select auth.uid())
    and members.left_at is null
  for update of rooms;

  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  select player_id into v_player_id
  from public.platform_room_members
  where room_id = v_room.id
    and user_id = (select auth.uid())
    and left_at is null;
  if v_player_id <> v_room.host_player_id then raise exception 'HOST_REQUIRED'; end if;

  update public.platform_rooms
  set status = 'closed', closed_at = now(), updated_at = now()
  where id = v_room.id;
  return true;
end;
$$;

create or replace function public.platform_leave_room(
  p_game_key text,
  p_code text,
  p_expected_revision bigint,
  p_room_state jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.platform_rooms%rowtype;
  v_state jsonb;
  v_revision bigint;
begin
  select * into v_room
  from public.platform_rooms
  where game_key = p_game_key and code = upper(p_code)
  for update;

  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if not public.is_platform_room_member(v_room.id) then raise exception 'NOT_AUTHORIZED'; end if;
  if v_room.revision <> p_expected_revision then raise exception 'REVISION_CONFLICT'; end if;

  v_revision := v_room.revision + 1;
  v_state := p_room_state - 'password';
  v_state := jsonb_set(v_state, '{revision}', to_jsonb(v_revision), true);
  v_state := jsonb_set(v_state, '{updatedAt}', to_jsonb(now()), true);

  update public.platform_rooms
  set
    status = coalesce(v_state ->> 'status', status),
    host_player_id = coalesce(v_state ->> 'hostId', host_player_id),
    state = v_state,
    revision = v_revision,
    updated_at = now(),
    closed_at = case when v_state ->> 'status' = 'closed' then now() else closed_at end
  where id = v_room.id;

  update public.platform_room_members
  set left_at = now(), last_seen_at = now()
  where room_id = v_room.id and user_id = (select auth.uid());
  return true;
end;
$$;

revoke all on function public.platform_create_room(text, jsonb, text) from public;
revoke all on function public.platform_join_room(text, text, jsonb, text) from public;
revoke all on function public.platform_update_room(text, text, bigint, jsonb) from public;
revoke all on function public.platform_close_room(text, text) from public;
revoke all on function public.platform_leave_room(text, text, bigint, jsonb) from public;
grant execute on function public.platform_create_room(text, jsonb, text) to authenticated;
grant execute on function public.platform_join_room(text, text, jsonb, text) to authenticated;
grant execute on function public.platform_update_room(text, text, bigint, jsonb) to authenticated;
grant execute on function public.platform_close_room(text, text) to authenticated;
grant execute on function public.platform_leave_room(text, text, bigint, jsonb) to authenticated;

grant select on public.platform_rooms to authenticated;
grant select on public.platform_room_members to authenticated;
grant select on public.platform_public_rooms to authenticated;

alter publication supabase_realtime add table public.platform_rooms;
