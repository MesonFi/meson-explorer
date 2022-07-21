import { Swaps, Shares, ShareCodes } from 'lib/db'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return await post(req, res)
  } else if (req.method === 'PUT') {
    return await put(req, res)
  }

  res.status(404).send()
}

async function post(req, res) {
  const { swapId, locale = 'en' } = req.query
  const swap = await Swaps.findById(swapId)
  if (!swap) {
    res.status(400).json({ error: { code: -32602, message: 'Failed to get swap data' } })
    return
  }

  const styles = []
  const duration = Math.floor((swap.released - swap.created) / 1000)
  if (swap.salt.charAt(4) === 'f') {
    if (swap.outChain !== '0x2328' || swap.amount < 100_000000) {
      res.status(400).json({ error: { code: -32602, message: 'Failed to create share code' } })
      return
    }
    styles.push('cashback-avax')
  } else if (duration > 240 || duration < 20 || swap.fee > 2_000_000 || swap.inToken > 2) {
    res.status(400).json({ error: { code: -32602, message: 'Failed to create share code' } })
    return
  }

  const address = swap.fromTo[0]
  let share = await Shares.findOne({ address })
  if (!share) {
    share = await Shares.findOneAndUpdate({ address: { $exists: false } }, { $set: { address } }, { new: true })
  }
  if (!share) {
    res.status(400).json({ error: { code: -32602, message: 'Failed to create share code' } })
    return
  }

  if (swap.outChain === '0x0a0a') {
    styles.push('aurora')
  } else if (swap.outChain === '0x2329') {
    styles.push('arbitrum')
  }

  if (['ar', 'fa'].includes(locale)) {
    styles.push('rtl')
  } else {
    styles.push('default')
  }

  let shareCode = await ShareCodes.findById(swapId)
  if (!shareCode) {
    shareCode = await ShareCodes.create({
      _id: swapId,
      code: `${share._id}${share.seq}`,
      style,
      encoded: swap.encoded,
      duration,
      locale,
      n: 0,
      expires: Date.now() + 7 * 86400_000
    })
    await Shares.findByIdAndUpdate(share._id, { $inc: { seq: 1 } })
  }

  const result = {
    code: shareCode.code,
    style: styles[0],
    styles,
    address,
    encoded: swap.encoded,
    duration,
  }

  res.json({ result })
}

async function put(req, res) {
  const { swapId, style } = req.query

  if (!['default', 'rtl', 'aurora', 'arbitrum', 'cashback-avax'].includes(style)) {
    res.status(400).send()
    return
  }

  await ShareCodes.findByIdAndUpdate(swapId, { $set: { style } })
  res.json({ result: true })
}