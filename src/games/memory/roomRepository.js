import { createGameRoomRepository } from '../../platform/supabaseRoomRepository.js'
import { getMemoryRoomSummary } from './gameEngine.js'

const SESSION_KEY = 'ugbz:memory:session:v1'

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
  summarize: getMemoryRoomSummary,
}

export const memoryRoomRepository = createGameRoomRepository({
  gameKey: 'memory',
  localRepository: unavailableRoomRepository,
  summarize: getMemoryRoomSummary,
  sessionKey: SESSION_KEY,
})
