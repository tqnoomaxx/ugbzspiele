-- Supabase installs pgcrypto in the extensions schema. Keep the restricted
-- security-definer search path and qualify the password functions explicitly.

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

revoke all on function public.platform_create_room(text, jsonb, text) from public;
revoke all on function public.platform_join_room(text, text, jsonb, text) from public;
grant execute on function public.platform_create_room(text, jsonb, text) to authenticated;
grant execute on function public.platform_join_room(text, text, jsonb, text) to authenticated;
