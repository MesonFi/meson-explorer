import { Swaps } from 'lib/db'
import { listHandler } from 'lib/api'
import { mergeDeep } from 'immutable'

export default listHandler({
  collection: Swaps,
  getAggregator: async req => {
    const page = Number(req.query.page) || 0

    const now = new Date()
    const y = now.getUTCFullYear()
    const m = now.getUTCMonth()
    const startDate = new Date(Date.UTC(y, m - page, 1))
    const endDate = new Date(Date.UTC(y, m - page + 1, 1))
    const firstSwap = await Swaps.findOne({ $ne: true }).sort({ created: 1 })
    const launchDate = firstSwap.created
    const maxPage = (y - launchDate.getUTCFullYear()) * 12 + m - launchDate.getUTCMonth() + 1

    const shared = [
      {
        $group: {
          _id: { $concat: ['$date', '$chain', '$tokenType'] },
          date: { $first: '$date' },
          chain: { $first: '$chain' },
          tokenType: { $first: '$tokenType' },
          count: { $sum: 1 },
          success: { $sum: { $cond: ['$success', 1, 0] } },
          volume: { $sum: { $cond: ['$success', '$amount', 0] } },
          srFee: { $sum: { $cond: ['$success', '$srFee', 0] } },
          lpFee: { $sum: { $cond: ['$success', '$lpFee', 0] } },
          addresses: { $addToSet: '$fromAddress' },
          duration: { $avg: { $cond: [{ $and: ['$success', { $lt: ['$duration', 600] }] }, '$duration', undefined] } }
        }
      },
      {
        $project: {
          date: '$date',
          chain: '$chain',
          item: {
            tokenType: '$tokenType',
            count: '$count',
            success: '$success',
            volume: '$volume',
            srFee: '$srFee',
            lpFee: '$lpFee',
            addresses: { $size: '$addresses' },
            duration: '$duration',
          }
        }
      },
      {
        $group: {
          _id: { $concat: ['$date', '$chain']},
          date: { $first: '$date' },
          chain: { $first: '$chain' },
          data: { $push: '$item' },
        }
      },
      {
        $project: {
          date: '$date',
          item: {
            chain: '$chain',
            data: { $sortArray: { input: '$data', sortBy: { tokenType: -1 } } },
          }
        }
      },
      {
        $group: {
          _id: '$date',
          data: { $push: '$item' },
        }
      },
      { $sort: { _id: -1 } }
    ]

    const aggregator = [
      {
        $match: {
          disabled: { $ne: true },
          created: { $gt: startDate, $lt: endDate },
          $nor: [
            { salt: { $regex : /^0x[d9]/ } },
            { 'fromTo.0': { $in: ['0x666d6b8a44d226150ca9058beebafe0e3ac065a2', '0x4fc928e89435f13b3dbf49598f9ffe20c4439cad'] } },
          ]
        }
      },
      {
        $project: {
          inChain: '$inChain',
          outChain: '$outChain',
          success: { $in: ['RELEASED', '$events.name'] },
          amount: { $toLong: '$amount' },
          srFee: { $toLong: '$srFee' },
          lpFee: { $toLong: '$lpFee' },
          duration: { $toLong: { $divide: [{ $subtract: ['$released', '$created'] }, 1000] } },
          date: { $dateToString: { date: '$created', format: '%Y-%m-%d' } },
          fromAddress: { $arrayElemAt: ['$fromTo', 0] },
          tokenType: { $cond: [
            { $and: [{ $gte: ['$inToken', 248] }, { $lt: ['$inToken', 252] }] },
            'bnb',
            { $cond: [
              { $and: [{ $gte: ['$inToken', 252] }, { $gt: ['$expireTs', new Date(1691700000 * 1000)] }] },
              'eth',
              'stablecoins'
            ] }
          ]}
        }
      },
      {
        $facet: {
          from: [{ $addFields: { chain: '$inChain' } }, ...shared],
          to: [{ $addFields: { chain: '$outChain' } }, ...shared],
        },
      },
    ]

    const postProcessor = list => {
      const result = list[0].from.map(item => {
        const { _id, data } = item
        const to = list[0].to.find(item => item._id === _id)
        const fromFields = Object.fromEntries(data.map(({ chain, data }) => [chain, { from: data }]))
        const toFields = Object.fromEntries(to.data.map(({ chain, data }) => [chain, { to: data }]))
        const fields = mergeDeep(fromFields, toFields)
        return { _id, ...fields }
      })
      return result
    }

    return { aggregator, postProcessor, maxPage }
  }
})
