import fetch from 'node-fetch'
import pick from 'lodash/pick'

import { TESTNET } from 'lib/const'

export default async function handler(req, res) {
  if (TESTNET) {
    res.status(404).send()
    return
  }
  if (req.method === 'GET') {
    const result = await getConfigVars()
    res.json({ result: pick(result, 'COLLECT') })
  } else if (req.method === 'POST') {
    await configVars({ COLLECT: 'true' })
    res.json({ result: true })
  } else if (req.method === 'DELETE') {
    await configVars({ COLLECT: '' })
    res.json({ result: true })
  }
  res.status(404).send()
}

async function getConfigVars(vars) {
  const dyno = 'meson-automation'
  const url = `https://api.heroku.com/apps/${dyno}/config-vars`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.HEROKU_TOKEN}`,
      Accept: 'application/vnd.heroku+json; version=3'
    }
  })
  return await response.json()
}

async function configVars(vars) {
  const dyno = 'meson-automation'
  const url = `https://api.heroku.com/apps/${dyno}/config-vars`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.HEROKU_TOKEN}`,
      Accept: 'application/vnd.heroku+json; version=3'
    },
    body: JSON.stringify(vars)
  })
  return await response.json()
}
