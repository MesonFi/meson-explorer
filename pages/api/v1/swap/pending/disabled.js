import { Swaps } from 'lib/db'
import { listHandler } from 'lib/api'
import { presets } from 'lib/swap'

export default listHandler({
  collection: Swaps,
  maxPageSize: 100,
  getQuery: req => {
    const { from, to } = req.query
    const query = { disabled: true }
    if (from) {
      query.inChain = presets.getNetwork(from).shortSlip44
    }
    if (to) {
      query.outChain = presets.getNetwork(to).shortSlip44
    }
    return query
  },
  sort: { created: -1 },
  select: 'encoded events initiator fromTo created released srFee lpFee'
})
