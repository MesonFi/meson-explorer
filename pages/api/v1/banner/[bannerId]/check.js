import { Banners } from 'lib/db'
import { getBannerQuery } from '.'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return await get(req, res)
  }
  res.status(404).send()
}

async function get(req, res) {
  const { bannerId, address = '' } = req.query
  const banner = await Banners.findOne(getBannerQuery(bannerId))
    .sort({ priority: -1 })
    .select('metadata')

  // ad hoc
  if (bannerId === 'bevm-odyssey') {
    if (!banner) {
      res.status(404).send()
      return
    }

    const match = banner.metadata.find(item => item.address === address.toLowerCase() )
    if (match) {
      res.json({ uniqueId: match.swapId || match.address })
    } else {
      res.status(404).send()
    }
    return
  }

  if (!banner) {
    res.json({ error: { code: 404, message: 'Not found' } })
    return
  }

  if (banner.metadata.find(item => item.address === address.toLowerCase() )) {
    res.json({ result: { isValid: true } })
  } else {
    res.json({ result: { isValid: false } })
  }
}
