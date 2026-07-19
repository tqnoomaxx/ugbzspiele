import { createLocalGameRepository } from '../../platform/localGameRepository.js'
import { isValidWerewolfGame } from './gameEngine.js'

export const werewolfRepository = createLocalGameRepository({
  storageKey: 'ugbz:werewolf:v1',
  validate: isValidWerewolfGame,
  protectRevision: true,
})
