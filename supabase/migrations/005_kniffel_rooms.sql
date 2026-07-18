-- Kniffel uses the shared room platform without a user-facing player cap.
-- Digital online rolls are generated inside Postgres so every device receives
-- one authoritative result.

alter table public.platform_rooms
  drop constraint if exists platform_rooms_max_players_check;

drop view public.platform_public_rooms;

alter table public.platform_rooms
  alter column max_players type integer using max_players::integer;

alter table public.platform_rooms
  add constraint platform_rooms_max_players_check check (max_players >= 1);

create view public.platform_public_rooms as
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

grant select on public.platform_public_rooms to authenticated;

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
    greatest(1, coalesce((p_room_state #>> '{options,maxPlayers}')::integer, 8)),
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
  if v_room.revision <> p_expected_revision then
    return jsonb_build_object('__platformError', 'REVISION_CONFLICT');
  end if;
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
    max_players = greatest(1, coalesce((v_state #>> '{options,maxPlayers}')::integer, max_players)),
    state = v_state,
    revision = v_revision,
    updated_at = now()
  where id = v_room.id;

  return v_state;
end;
$$;

create or replace function public.platform_roll_kniffel_dice(
  p_code text,
  p_expected_revision bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.platform_rooms%rowtype;
  v_member_player_id text;
  v_active_player_id text;
  v_device_mode text;
  v_roll_count integer;
  v_previous_dice jsonb;
  v_held jsonb;
  v_dice jsonb := '[]'::jsonb;
  v_state jsonb;
  v_revision bigint;
  v_index integer;
begin
  if (select auth.uid()) is null then raise exception 'SESSION_REQUIRED'; end if;

  select * into v_room
  from public.platform_rooms
  where game_key = 'kniffel' and code = upper(p_code)
  for update;

  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.revision <> p_expected_revision then
    return jsonb_build_object('__platformError', 'REVISION_CONFLICT');
  end if;

  select player_id into v_member_player_id
  from public.platform_room_members
  where room_id = v_room.id
    and user_id = (select auth.uid())
    and left_at is null;

  if v_member_player_id is null then raise exception 'NOT_AUTHORIZED'; end if;
  if v_room.status <> 'playing' or v_room.state #>> '{game,phase}' <> 'turn' then raise exception 'INVALID_PHASE'; end if;
  if v_room.state #>> '{options,playMode}' <> 'digital' then raise exception 'PHYSICAL_DICE_MODE'; end if;

  v_active_player_id := v_room.state #>> '{game,activePlayerId}';
  v_device_mode := v_room.state #>> '{options,deviceMode}';
  if (v_device_mode = 'shared' and v_member_player_id <> v_room.host_player_id)
    or (v_device_mode <> 'shared' and v_member_player_id <> v_active_player_id)
  then
    raise exception 'NOT_YOUR_TURN';
  end if;

  v_roll_count := coalesce((v_room.state #>> '{game,rollCount}')::integer, 0);
  if v_roll_count >= 3 then raise exception 'ROLL_LIMIT'; end if;
  v_previous_dice := coalesce(v_room.state #> '{game,dice}', '[null,null,null,null,null]'::jsonb);
  v_held := coalesce(v_room.state #> '{game,held}', '[false,false,false,false,false]'::jsonb);

  for v_index in 0..4 loop
    if v_roll_count > 0 and coalesce((v_held ->> v_index)::boolean, false) then
      v_dice := v_dice || jsonb_build_array((v_previous_dice ->> v_index)::integer);
    else
      v_dice := v_dice || jsonb_build_array(1 + (get_byte(extensions.gen_random_bytes(1), 0) % 6));
    end if;
  end loop;

  v_revision := v_room.revision + 1;
  v_state := jsonb_set(v_room.state, '{game,dice}', v_dice, true);
  v_state := jsonb_set(v_state, '{game,rollCount}', to_jsonb(v_roll_count + 1), true);
  if v_roll_count = 0 then
    v_state := jsonb_set(v_state, '{game,held}', '[false,false,false,false,false]'::jsonb, true);
  end if;
  v_state := jsonb_set(v_state, '{revision}', to_jsonb(v_revision), true);
  v_state := jsonb_set(v_state, '{updatedAt}', to_jsonb(now()), true);

  update public.platform_rooms
  set state = v_state, revision = v_revision, updated_at = now()
  where id = v_room.id;

  return v_state;
end;
$$;

revoke all on function public.platform_create_room(text, jsonb, text) from public;
revoke all on function public.platform_update_room(text, text, bigint, jsonb) from public;
revoke all on function public.platform_roll_kniffel_dice(text, bigint) from public;
grant execute on function public.platform_create_room(text, jsonb, text) to authenticated;
grant execute on function public.platform_update_room(text, text, bigint, jsonb) to authenticated;
grant execute on function public.platform_roll_kniffel_dice(text, bigint) to authenticated;
