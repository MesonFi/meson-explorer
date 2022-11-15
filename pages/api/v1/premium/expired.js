import { Premiums, Swaps } from 'lib/db'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const result = await _getExpiredList()
    res.json({ result })
  } else {
    res.status(404).send()
  }
}

async function _getExpiredList() {
  return await Premiums.find({ until: { $gt : new Date()}}).select('initiator params')
}
