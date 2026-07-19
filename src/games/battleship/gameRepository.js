import { createLocalGameRepository } from '../../platform/localGameRepository.js'
import { isValidBattleshipGame } from './gameEngine.js'

export const battleshipRepository = createLocalGameRepository({
  storageKey: 'ugbz:battleship:v1',
  validate: isValidBattleshipGame,
  protectRevision: true,
})
