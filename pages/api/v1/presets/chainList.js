import mesonPresets from '@mesonfi/presets'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const networks = mesonPresets.getAllNetworks()
    const tokenList = networks.map(({ name, chainId, tokens }) => ({
      name,
      chainId,
      tokens
    }))
    res.json(tokenList)
  } else {
    res.status(404).send()
  }
}

