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
  const [bannerId, task] = req.query.bannerId.split(':')
  const banner = await Banners.findOne(getBannerQuery(bannerId))
    .sort({ priority: -1 })
    .select('metadata')

  if (!banner) {
    res.json({ error: { code: 404, message: 'Not found' } })
    return
  }

  let result = []
  if (bannerId === 'blast-off-to-manta') {
    const swaps = await Swaps.find({
      created: {
        $gt: new Date('2024-03-01T00:00:00.000Z'),
      },
      'events.name': 'RELEASED',
      inChain: '0x1331',
      outChain: '0x0263',
      inToken: 255, outToken: 254,
    }).select('fromTo amount')
    
    const balances = {}
    let total = 0
    swaps.forEach(s => {
      const addr = s.fromTo[0]
      balances[addr] = (balances[addr] || 0) + s.amount
      total += s.amount
    })
    result = Object.entries(balances).map(([addr, amount]) => ({ addr, amount })).filter(x => x.amount >= 100000)
  } else if (bannerId === 'zkfair-dragon-slayer') {
    const query = {
      created: {
        $gt: new Date('2024-03-19T00:00:00.000Z'),
        $lt: new Date('2024-03-25T00:00:00.000Z'),
      },
      'events.name': 'RELEASED',
    }
    if (task === '1') {
      query.outChain = '0xa70e'
      query.outToken = 49
      query.amount = { $gte: 100_000_000 }
    } else if (task === '2') {
      query.outChain = '0xa70e'
      query.outToken = 254
      query.amount = { $gte: 110_000 }
    } else if (task === '3') {
      query.inChain = '0xa70e'
      query.outChain = '0x1331'
      query.inToken = 254
      query.amount = { $gte: 110_000 }
    } else {
      res.status(404).send()
      return
    }

    const swaps = await Swaps.find(query).select('fromTo amount')

    const balances = {}
    let total = 0
    swaps.forEach(s => {
      const addr = s.fromTo[0]
      balances[addr] = (balances[addr] || 0) + s.amount
      total += s.amount
    })
    result = Object.entries(balances).map(([addr, amount]) => ({ addr, amount }))
  }

  res.json({ result })
}
