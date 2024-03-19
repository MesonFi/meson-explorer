import { Swaps } from 'lib/db'
import { SWAP_RES_FIELDS } from 'lib/const'

export default async function handler(req, res) {
  const address = req.query.address
  const createdSince = Date.now() - 3600_000 * 24 * 7
  const updatedSince = Date.now() - 3600_000 * 6
  const query = {
    fromTo: address,
    created: { $gt: createdSince },
    $or: [
      { updated: { $gt: updatedSince } },
      { 'events.name': { $eq: 'BONDED', $nin: ['RELEASED', 'CANCELLED'] } },
    ],
    disabled: { $exists: false }
  }
  
  const result = await Swaps.find(query)
    .select(SWAP_RES_FIELDS)
    .sort({ created: -1 })
    .exec()

  const list = result.filter(item => item.fromTo[0] === address)
  res.json({ result: { total: list.length, list } })
}