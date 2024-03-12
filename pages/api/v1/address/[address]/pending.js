import { Swaps } from 'lib/db'
import { SWAP_RES_FIELDS } from 'lib/const'

export default async function handler(req, res) {
  const address = req.query.address
  const since = Date.now() - 3600_000 * 6
  const query = {
    'fromTo.0': address,
    $or: [
      { updated: { $gt: since } },
      { 'events.name': { $eq: 'BONDED', $nin: ['RELEASED', 'CANCELLED'] } },
    ],
    disabled: { $exists: false }
  }
  
  const list = await Swaps.find(query)
    .select(SWAP_RES_FIELDS)
    .sort({ created: -1 })
    .exec()

  res.json({ result: { total: list.length, list } })
}