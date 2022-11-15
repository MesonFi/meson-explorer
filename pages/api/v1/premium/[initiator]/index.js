import { Premiums, Banners } from 'lib/db'
import { BigNumber } from 'ethers'
import TronWeb from 'tronweb'
import _ from 'lodash'

export default async function handler(req, res) {
  const initiator = req.query.initiator.toLowerCase()
  if (req.method === 'GET') {
    const result = await get(initiator)
    res.json({ result })
  } else if (req.method === 'POST') {
    try {
      const result = await post(initiator)
      res.json({ result })
    } catch (e) {
      res.status(400).json({ error: { code: -32602, message: `Failed to claim premium: ${e.message}` } })
    }
  } else if (req.method === 'PUT') {
    try {
      const result = await _updatePremiumRoleClaim(initiator, req.body)
      res.json({ result })
    } catch (e) {
      res.status(400).json({ error: { code: -32602, message: `Failed to update premium: ${e.message}` } })
    }
  } else if (req.method === 'OPTIONS') {
    res.end()
  } else {
    res.status(404).send()
  }
}

async function get(initiator, withId = false) {
  const d = new Date()
  const query = { _id: { $gt: `${initiator}:${d.valueOf() / 1000}`, $lt: `${initiator}:~` } }
  return await Premiums.find(query)
    .sort({ _id: 1 })
    .select('-__v -meta' + withId ? '' : ' -_id')
    .exec()
}

async function post(initiator) {
  const freePremium = await Banners.findOneAndUpdate({
    text: 'banner|free-premium',
    address: initiator,
  }, { $addToSet: { meta: { address: initiator } } }).select('text')
  if (!freePremium) {
    throw new Error('Not eligible to claim Meson Premium')
  }

  const premiums = await get(initiator)
  if (premiums?.length) {
    return premiums
  }
  const since = new Date()
  since.setUTCHours(0,0,0,0)
  const premium = await _create(initiator, 500000_000000, since, undefined, { hash: initiator, erc20Value: 0 })
  return [_.omit(premium.toJSON(), ['_id', '__v', 'meta'])]
}

async function _updatePremiumRoleClaim(initiator, body) {
  // TODO: add the limit to invoke
  if(!body.discordId) {
    throw new Error('Update premium error')
  }

  const premiums = await get(initiator)
  if (!premiums?.length) {
    throw new Error('The address is not Meson Premium')
  }

  return await Premiums.findOneAndUpdate({ initiator }, { $addToSet: { params: { roleClaimed: body.claim, discordId: body.discordId } }})
}

export async function onPremiumPaid(data) {
  let initiator
  if (data.network.startsWith('tron')) {
    initiator = TronWeb.address.toHex(data.from).replace('41', '0x')
  } else {
    initiator = data.from.toLowerCase()
  }
  const exists = await get(initiator, true)
  const paid = BigNumber.from(data.erc20Value).add(10000)
  let premium
  if (exists?.length && paid.lt(10_000_000)) {
    premium = await _addExtra(exists[0]._id, initiator, paid.mul(50000).toNumber(), data)
  } else {
    let since = new Date()
    const lastPremium = exists?.[exists.length - 1]
    if (lastPremium) {
      since = new Date((lastPremium.until + 1) * 1000)
    } else {
      since.setUTCHours(0,0,0,0)
    }
    premium = await _create(initiator, paid.mul(50000).toNumber(), since, lastPremium?.hide, data)
  }
  return [_.omit(premium.toJSON(), ['_id', '__v', 'meta'])]
}

async function _create(initiator, quota, since, hide, { hash, erc20Value, ...tx }) {
  const until = since.valueOf() + 86400_000 * 30 - 1000
  return await Premiums.create({
    _id: `${initiator}:${until / 1000}`,
    initiator,
    hash,
    used: 0,
    quota,
    paid: Number(erc20Value),
    since,
    until: new Date(until),
    hide,
    meta: tx
  })
}

async function _addExtra(_id, initiator, quota, { hash, erc20Value, ...tx }) {
  await Premiums.create({
    _id: hash,
    initiator,
    hash,
    paid: Number(erc20Value),
    meta: tx
  })
  return await Premiums.findOneAndUpdate({ _id }, { $inc: { quota } }, { new: true })
}
