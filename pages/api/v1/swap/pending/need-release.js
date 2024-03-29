import { Swaps } from 'lib/db'
import { listHandler } from 'lib/api'
import { presets } from 'lib/swap'
import { SWAP_RES_FIELDS } from 'lib/const'

export default listHandler({
  collection: Swaps,
  getQuery: req => {
    const { from, to } = req.query
    const query = {
      released: { $exists: false },
      'events.name': { $eq: 'EXECUTED', $nin: ['RELEASED', 'CANCELLED'] },
      errorConfirmed: { $ne: true },
      modified: { $ne: true },
      disabled: { $exists: false }
    }
    if (from) {
      query.inChain = presets.getNetwork(from).shortSlip44
    }
    if (to) {
      query.outChain = presets.getNetwork(to).shortSlip44
    }
    return query
  },
  sort: { created: -1 },
  hint: { released: 1 },
  select: SWAP_RES_FIELDS
})
