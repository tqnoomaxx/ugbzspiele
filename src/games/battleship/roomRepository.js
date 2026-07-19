import { createGameRoomRepository } from '../../platform/supabaseRoomRepository.js'
import { getBattleshipRoomSummary } from './gameEngine.js'

const SESSION_KEY = 'ugbz:battleship:session:v1'

function onlineUnavailable() {
  throw new Error('Räume auf mehreren Geräten benötigen den Online-Modus.')
}

const unavailableRoomRepository = {
  mode: 'local',
  isOnline: false,
  load: () => null,
  listPublic: () => [],
  create: onlineUnavailable,
  join: onlineUnavailable,
  mutate: onlineUnavailable,
  leave: onlineUnavailable,
  remove: onlineUnavailable,
  loadSession: () => null,
  saveSession: () => false,
  clearSession: () => false,
  subscribe: () => () => {},
  summarize: getBattleshipRoomSummary,
}

export const battleshipRoomRepository = createGameRoomRepository({
  gameKey: 'battleship',
  localRepository: unavailableRoomRepository,
  summarize: getBattleshipRoomSummary,
  sessionKey: SESSION_KEY,
})
