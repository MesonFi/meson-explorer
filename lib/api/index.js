import { getToken } from 'next-auth/jwt'

export function listHandler({ collection, getQuery, getAggregator, postProcessor, sort = {}, hint = {}, select = '' }) {
  return async (req, res) => {
    const roles = (await getToken({ req }))?.roles
    const headerRoles = (req.headers?.['x-roles'] || '').split(',')
    const maxPageSize = roles?.some(r => ['root', 'admin'].includes(r)) ? 100 : 20

    const page = Number(req.query.page) || 0
    const size = Number(req.query.size) || 10
    if (page < 0 || page !== Math.floor(page)) {
      res.status(400).json({ error: { code: -32602, message: 'Invalid page value' } })
      return
    } else if (size < 1 || size !== Math.floor(size)) {
      res.status(400).json({ error: { code: -32602, message: 'Invalid size value' } })
      return
    } else if (size > maxPageSize) {
      res.status(400).json({ error: { code: -32602, message: `Size cannot exceed ${maxPageSize}` } })
      return
    }

    if (getQuery) {
      const query = await getQuery(req, roles, headerRoles)
      if (req.query.count === 'true') {
        const total = await collection.count(query)
        res.json({ result: { total } })
      } else {
        let list = await collection.find(query)
          .hint(hint)
          .sort(sort)
          .limit(size)
          .skip(size * page)
          .select(select)
          .exec()
        if (postProcessor) {
          list = await postProcessor(list, req)
        }
        res.json({ result: { list } })
      }
    } else {
      const result = await getAggregator(req, roles)
      if (!result) {
        return res.status(404).end()
      }
      const { aggregator, ...rest } = result
      if (Object.keys(sort).length) {
        aggregator.unshift({ $sort: sort })
      }
      if (select) {
        aggregator.push({ $project: Object.fromEntries(select.split(' ').map(key => [key, 1])) })
      }
      let list = await collection.aggregate(aggregator)
      if (postProcessor) {
        list = await postProcessor(list, req)
      }
      res.json({ result: { list, ...rest } })
    }
  }
}
