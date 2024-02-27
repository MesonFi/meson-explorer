import fetch from 'node-fetch'
import { Swaps, SwapFails } from 'lib/db'
import { restartService } from '../admin/server/restart'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    await get(req, res)
  } else if (req.method === 'POST') {
    await post(req, res)
  } else {
    res.status(404).send()
  }
}

async function getRecentFailRate() {
  const query = { disabled: { $exists: false } }
  const list = await Swaps.find(query)
    .select('events created released')
    .sort({ created: -1 })
    .limit(20)
    .exec()
  
  const released = list.filter(swap => !!swap.events.find(e => e.name === 'RELEASED'))
  
  const durations = released.map(swap => swap.released - swap.created)
  const fails = (20 - released.length) / 20

  const duration = Math.floor(durations.reduce((x, y) => x + y, 0 ) / durations.length / 1000)
  return { fails, duration }
}

async function get(req, res) {
  const result = await getRecentFailRate()
  res.json({ result })
}

async function post(req, res) {
  const result = { ...(await getRecentFailRate()), ts: new Date() }
  if (result.fails > 0.2 || result.duration > 7 * 60) {
    result.restart = true
    await restartService('lp')
    await pushNotification(result)
  }
  await SwapFails.create(result)
  res.json({ result })
}

async function pushNotification({ fails, duration }) {
  const rate = Math.floor(100 * fails)
  const dur = `${Math.floor(duration / 60)}m${duration % 60}s`
  const body = JSON.stringify({
    message: `Fail Rate: ${rate}%; Avg duration: ${dur}`,
    description: 'alert message body here',
    tags: ['Meson', 'SwapSuccessRateAlert', 'Important'],
    entity: 'Meson', 
    priority: 'P3'
  })

  const response = await fetch('https://api.eu.opsgenie.com/v2/alerts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `GenieKey ${process.env.GENIE_KEY}`
    },
    body
  })
  return await response.json()
}