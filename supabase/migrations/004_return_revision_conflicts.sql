-- Optimistic concurrency conflicts are an expected part of simultaneous play.
-- Return them as data so PostgREST responds with HTTP 200 and the client can
-- retry without producing failed network requests in every player's browser.

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
    max_players = greatest(2, least(32, coalesce((v_state #>> '{options,maxPlayers}')::smallint, max_players))),
    state = v_state,
    revision = v_revision,
    updated_at = now()
  where id = v_room.id;

  return v_state;
end;
$$;

revoke all on function public.platform_update_room(text, text, bigint, jsonb) from public;
grant execute on function public.platform_update_room(text, text, bigint, jsonb) to authenticated;
