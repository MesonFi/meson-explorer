import mesonPresets from '@mesonfi/presets'
import { BigNumber } from 'ethers'
import { Rules, FeeWaives } from 'lib/db'

const _matchNetworkToken = (rule, [n1, t1]) => {
  let n0, t0
  if (typeof rule === 'string') {
    n0 = rule.split(':')[0]
    t0 = rule.split(':')[1] || '*'
  } else {
    n0 = rule[0]
    t0 = rule[1]
  }
  if (n0 !== '*' && !n1.includes(n0)) {
    return false
  }
  if (typeof t0 === 'undefined' || t0 === '*' || t1.includes(t0)) {
    return true
  }
  return false
}

const matchSwapRule = (rules, { from, to }) => {
  if (!rules) {
    return
  }
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]
    if (from[0] && _matchNetworkToken(rule.from, from) && _matchNetworkToken(rule.to, to)) {
      return rule
    }
  }
}

async function getSwapRules(initiator) {
  const rules = await Rules.find().sort({ priority: -1 }).exec()
    if (initiator) {
      const date = new Date()
      date.setUTCHours(0,0,0,0)
      const waived = await FeeWaives.findById(`${initiator.toLowerCase()}:${date.valueOf() / 1000}`)
      return { rules, waived: waived?.waived || 0, swaps: waived?.swaps || 0 }
    }
    return { rules }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // NOTE: non-preminum address, just using for data query
    const address = '0x18D594bF5213A847c001775d8C4AaC9427284774'
    const { token, inChain, outChain, amount: queryAmount } = req.query

    const rulesInfo = await getSwapRules(address)


    await getSwapRules()
    const networks = mesonPresets.getAllNetworks()

    const fromNetwork = networks.find(item => item.name === inChain)
    const toNetwork = networks.find(item => item.name === outChain)

    const rule = matchSwapRule(rulesInfo.rules, {
      from: [fromNetwork.id, token],
      to: [toNetwork.id, token]
    })

    if (rule.limit === 0) {
      res.json({
        message: 'This swap route is not available',
        code: 500
      })
    }

    const amount = BigNumber.from(queryAmount || '0')
    // const waiveServiceFee = swapData.premium
    // ? swapData.premium.used < swapData.premium.quota
    // : (cached.waived < 10000_000_000 && cached.swaps < 10)

    // non-premium
    const waiveServiceFee = rulesInfo.waived < 10000_000_000 && rulesInfo.swaps < 10
    let originalFee = amount.div(1000)
    let totalFee = waiveServiceFee ? BigNumber.from(0) : originalFee
    let lpFee = BigNumber.from(0)

    if (!rule || amount.eq(0)) {
      res.json({
        totalFee, originalFee, lpFee, waiveServiceFee, waived: rulesInfo.waived,
        code: 200
      })
    }

    let indexFeeRule = 0
    while (indexFeeRule < rule.fee?.length) {
      const feeRule = rule.fee[indexFeeRule]
      if (feeRule.min && BigNumber.from(feeRule.min).mul(1e6).gt(amount)) {
        indexFeeRule++
        continue
      }
      const minLpFee = BigNumber.from(feeRule.base || 0)
      lpFee = amount.mul(typeof feeRule.rate === 'number' ? feeRule.rate : 1000).div(1e6)
      if (lpFee.lt(minLpFee)) {
        lpFee = minLpFee
      }
      originalFee = originalFee.add(lpFee)
      totalFee = totalFee.add(lpFee)
      break
    }

    res.json({
      data: { totalFee, originalFee, lpFee, waiveServiceFee, waived: rulesInfo.waived, swaps: rulesInfo.swaps },
      code: 200
    })
  } else {
    res.status(404).send()
  }
}