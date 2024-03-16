import { Swaps, Banners } from 'lib/db'

export function getBannerQuery (bannerId) {
  const query = { disabled: { $ne: true } }
  if (bannerId) {
    query._id = bannerId
  }
  return query
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return await get(req, res)
  }
  res.status(404).send()
}

async function get(req, res) {
  const { bannerId } = req.query
  const banner = await Banners.findOne(getBannerQuery(bannerId))
    .sort({ priority: -1 })
    .select('metadata')

  if (!banner) {
    res.json({ error: { code: 404, message: 'Not found' } })
    return
  }

  let result = []
  if (bannerId === 'blast-off-to-manta') {
    const swaps = await Swaps.find({inChain: '0x1331', outChain: '0x0263', inToken: 255, outToken: 254 })
      .select('fromTo amount')
    
    const balances = {}
    let total = 0
    swaps.forEach(s => {
      const addr = s.fromTo[0]
      balances[addr] = (balances[addr] || 0) + s.amount
      total += s.amount
    })
    result = Object.entries(balances).map(([addr, amount]) => ({ addr, amount })).filter(x => x.amount >= 100000)
    // console.log(total)
  }

  res.json({ result })
}
