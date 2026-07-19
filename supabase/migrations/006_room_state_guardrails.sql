-- Guard the generic room endpoint against identity/option tampering and very
-- rapid writes. Game actions still use optimistic revisions; private role data
-- remains a friends-only trust model until actions are moved to game-specific RPCs.

create index if not exists platform_rooms_stale_idx
  on public.platform_rooms (updated_at);

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
  v_player jsonb;
  v_player_id text := left(trim(p_player ->> 'id'), 100);
  v_player_name text := left(regexp_replace(trim(p_player ->> 'name'), '\s+', ' ', 'g'), 28);
  v_state jsonb;
  v_revision bigint;
begin
  if (select auth.uid()) is null then raise exception 'SESSION_REQUIRED'; end if;
  if jsonb_typeof(p_player) <> 'object' or v_player_id !~ '^[A-Za-z0-9][A-Za-z0-9_-]{2,99}$' then
    raise exception 'INVALID_PLAYER';
  end if;
  if char_length(v_player_name) not between 1 and 28 then raise exception 'INVALID_NAME'; end if;

  select * into v_room
  from public.platform_rooms
  where game_key = p_game_key and code = upper(p_code)
  for update;

  if not found or v_room.status = 'closed' then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.status <> 'lobby' then raise exception 'ROOM_ALREADY_STARTED'; end if;
  if exists (
    select 1 from public.platform_room_members
    where room_id = v_room.id and user_id = (select auth.uid()) and left_at is null
  ) then
    raise exception 'ALREADY_JOINED';
  end if;

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
    where lower(player ->> 'name') = lower(v_player_name)
      or player ->> 'id' = v_player_id
  ) then raise exception 'NAME_TAKEN'; end if;

  v_player := jsonb_build_object(
    'id', v_player_id,
    'name', v_player_name,
    'score', 0,
    'isHost', false,
    'isDemo', false,
    'connected', true,
    'joinedAt', now()
  );
  v_revision := v_room.revision + 1;
  v_state := jsonb_set(v_room.state, '{players}', v_players || jsonb_build_array(v_player), true);
  v_state := jsonb_set(v_state, '{revision}', to_jsonb(v_revision), true);
  v_state := jsonb_set(v_state, '{updatedAt}', to_jsonb(now()), true);

  update public.platform_rooms
  set state = v_state, revision = v_revision, updated_at = now()
  where id = v_room.id;

  insert into public.platform_room_members (room_id, user_id, player_id)
  values (v_room.id, (select auth.uid()), v_player_id)
  on conflict (room_id, user_id) do update
  set player_id = excluded.player_id, joined_at = now(), left_at = null, last_seen_at = now();

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
  v_member_player_id text;
  v_last_seen_at timestamptz;
  v_old_player_identities jsonb;
  v_new_player_identities jsonb;
begin
  if (select auth.uid()) is null then raise exception 'SESSION_REQUIRED'; end if;
  if jsonb_typeof(p_room_state) <> 'object' or pg_column_size(p_room_state) > 1048576 then
    raise exception 'INVALID_STATE';
  end if;

  select * into v_room
  from public.platform_rooms
  where game_key = p_game_key and code = upper(p_code)
  for update;

  if not found then raise exception 'ROOM_NOT_FOUND'; end if;

  select player_id, last_seen_at into v_member_player_id, v_last_seen_at
  from public.platform_room_members
  where room_id = v_room.id
    and user_id = (select auth.uid())
    and left_at is null
  for update;

  if v_member_player_id is null then raise exception 'NOT_AUTHORIZED'; end if;
  if v_room.revision <> p_expected_revision then
    return jsonb_build_object('__platformError', 'REVISION_CONFLICT');
  end if;
  if v_last_seen_at > clock_timestamp() - interval '100 milliseconds' then
    raise exception 'RATE_LIMITED';
  end if;

  if p_room_state ->> 'id' is distinct from v_room.state ->> 'id'
    or upper(p_room_state ->> 'code') is distinct from v_room.code
    or p_room_state ->> 'hostId' is distinct from v_room.host_player_id
    or p_room_state -> 'options' is distinct from v_room.state -> 'options'
    or p_room_state ->> 'name' is distinct from v_room.state ->> 'name'
    or p_room_state ->> 'visibility' is distinct from v_room.state ->> 'visibility'
    or p_room_state ->> 'createdAt' is distinct from v_room.state ->> 'createdAt'
  then
    raise exception 'IMMUTABLE_ROOM_FIELDS';
  end if;

  if jsonb_typeof(p_room_state -> 'players') <> 'array'
    or jsonb_array_length(p_room_state -> 'players') < 1
    or jsonb_array_length(p_room_state -> 'players') > v_room.max_players
  then
    raise exception 'INVALID_PLAYERS';
  end if;

  select coalesce(jsonb_agg(player.value - 'score' - 'connected' order by player.ordinality), '[]'::jsonb)
  into v_old_player_identities
  from jsonb_array_elements(v_room.state -> 'players') with ordinality as player(value, ordinality);

  select coalesce(jsonb_agg(player.value - 'score' - 'connected' order by player.ordinality), '[]'::jsonb)
  into v_new_player_identities
  from jsonb_array_elements(p_room_state -> 'players') with ordinality as player(value, ordinality);

  if v_new_player_identities is distinct from v_old_player_identities then
    raise exception 'PLAYER_IDENTITIES_IMMUTABLE';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(p_room_state -> 'players') player
    where player ->> 'id' = v_member_player_id
  ) then
    raise exception 'MEMBER_PLAYER_MISSING';
  end if;

  v_revision := v_room.revision + 1;
  v_state := p_room_state - 'password';
  v_state := jsonb_set(v_state, '{revision}', to_jsonb(v_revision), true);
  v_state := jsonb_set(v_state, '{updatedAt}', to_jsonb(now()), true);

  update public.platform_rooms
  set
    status = coalesce(v_state ->> 'status', status),
    state = v_state,
    revision = v_revision,
    updated_at = now()
  where id = v_room.id;

  update public.platform_room_members
  set last_seen_at = now()
  where room_id = v_room.id and user_id = (select auth.uid());

  return v_state;
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
  v_member_player_id text;
  v_remaining_players jsonb;
  v_new_host_id text;
  v_state jsonb;
  v_revision bigint;
  v_status text;
begin
  select * into v_room
  from public.platform_rooms
  where game_key = p_game_key and code = upper(p_code)
  for update;

  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.status <> 'lobby' then raise exception 'ROOM_ALREADY_STARTED'; end if;

  select player_id into v_member_player_id
  from public.platform_room_members
  where room_id = v_room.id
    and user_id = (select auth.uid())
    and left_at is null
  for update;

  if v_member_player_id is null then raise exception 'NOT_AUTHORIZED'; end if;
  if v_room.revision <> p_expected_revision then raise exception 'REVISION_CONFLICT'; end if;

  select coalesce(jsonb_agg(player.value order by player.ordinality), '[]'::jsonb)
  into v_remaining_players
  from jsonb_array_elements(v_room.state -> 'players') with ordinality as player(value, ordinality)
  where player.value ->> 'id' <> v_member_player_id;

  if jsonb_array_length(v_remaining_players) = 0 then
    v_new_host_id := null;
    v_status := 'closed';
  else
    v_status := 'lobby';
    if v_member_player_id = v_room.host_player_id then
      v_new_host_id := p_room_state ->> 'hostId';
      if not exists (
        select 1 from jsonb_array_elements(v_remaining_players) player
        where player ->> 'id' = v_new_host_id
      ) then
        select player ->> 'id' into v_new_host_id
        from jsonb_array_elements(v_remaining_players) player
        limit 1;
      end if;
    else
      v_new_host_id := v_room.host_player_id;
    end if;

    select jsonb_agg(
      jsonb_set(player.value, '{isHost}', to_jsonb(player.value ->> 'id' = v_new_host_id), true)
      order by player.ordinality
    ) into v_remaining_players
    from jsonb_array_elements(v_remaining_players) with ordinality as player(value, ordinality);
  end if;

  v_revision := v_room.revision + 1;
  v_state := jsonb_set(v_room.state, '{players}', v_remaining_players, true);
  v_state := jsonb_set(v_state, '{hostId}', coalesce(to_jsonb(v_new_host_id), 'null'::jsonb), true);
  v_state := jsonb_set(v_state, '{status}', to_jsonb(v_status), true);
  v_state := jsonb_set(v_state, '{revision}', to_jsonb(v_revision), true);
  v_state := jsonb_set(v_state, '{updatedAt}', to_jsonb(now()), true);

  update public.platform_rooms
  set
    status = v_status,
    host_player_id = coalesce(v_new_host_id, host_player_id),
    state = v_state,
    revision = v_revision,
    updated_at = now(),
    closed_at = case when v_status = 'closed' then now() else closed_at end
  where id = v_room.id;

  update public.platform_room_members
  set left_at = now(), last_seen_at = now()
  where room_id = v_room.id and user_id = (select auth.uid());

  return true;
end;
$$;

create or replace function public.platform_cleanup_rooms(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  delete from public.platform_rooms
  where (status = 'closed' and updated_at < p_now - interval '7 days')
    or (status = 'complete' and updated_at < p_now - interval '30 days')
    or (status = 'lobby' and updated_at < p_now - interval '24 hours')
    or (status = 'playing' and updated_at < p_now - interval '7 days');
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.platform_update_room(text, text, bigint, jsonb) from public;
revoke all on function public.platform_join_room(text, text, jsonb, text) from public;
revoke all on function public.platform_leave_room(text, text, bigint, jsonb) from public;
revoke all on function public.platform_cleanup_rooms(timestamptz) from public;
grant execute on function public.platform_update_room(text, text, bigint, jsonb) to authenticated;
grant execute on function public.platform_join_room(text, text, jsonb, text) to authenticated;
grant execute on function public.platform_leave_room(text, text, bigint, jsonb) to authenticated;
grant execute on function public.platform_cleanup_rooms(timestamptz) to service_role;
