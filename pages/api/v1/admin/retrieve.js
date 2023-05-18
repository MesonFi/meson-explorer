import fetch from 'node-fetch'
import { presets } from 'lib/swap'

const relayer = process.env.NEXT_PUBLIC_SERVER_URL.split(',')[0]

const query = (addr, page = 1, pageSize = 100) => `?module=account&action=txlist&address=${addr}&startblock=0&endblock=99999999&page=${page}&offset=${pageSize}&sort=desc`

const API_HOSTS = {
  eth: 'https://api.etherscan.io/api',
  bnb: 'https://api.bscscan.com/api',
  polygon: 'https://api.polygonscan.com/api',
  arb: 'https://api.arbiscan.io/api',
  opt: 'https://api-optimistic.etherscan.io/api',
  avax: 'https://api.snowtrace.io/api',
  ftm: 'https://api.ftmscan.com/api',
  aurora: 'https://explorer.mainnet.aurora.dev/api',
  cfx: 'https://evmapi.confluxscan.net/api',
  movr: 'https://api-moonriver.moonscan.io/api',
  beam: 'https://api-moonbeam.moonscan.io/api',
  zksync: 'https://zksync2-mainnet-explorer.zksync.io/transactions',
  aptos: 'https://indexer.mainnet.aptoslabs.com/v1/graphql',
  sui: 'https://explorer-rpc.mainnet.sui.io/',
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    await post(req, res)
  } else {
    res.status(404).send()
  }
}

async function post(req, res) {
  const { networkId, encoded, page = 1, size = 100 } = req.body

  if (networkId === 'aptos') {
    const txs = await retrieveAptos(page, size)
    await Promise.all(txs.map(version => postTx(networkId, version)))
    res.json({ result: txs })
    return
  } else if (networkId === 'sui') {
    const txs = await retrieveSui(page, size)
    await Promise.all(txs.map(hash => postTx(networkId, hash)))
    res.json({ result: txs })
    return
  }

  const network = presets.getNetwork(networkId)
  if (!network) {
    res.status(404).send()
    return
  }
  const host = API_HOSTS[networkId]
  if (!host) {
    res.status(404).send()
    return
  }

  if (networkId === 'zksync') {
    const txs = await retrieveZksync(network.mesonAddress, page, size)
    await Promise.all(txs.map(hash => postTx(networkId, hash)))
    res.json({ result: txs })
    return
  }

  const url = host + query(network.mesonAddress, page, size)
  const response = await fetch(url)
  const json = await response.json()
  const txs = json.result
    .filter(tx => tx.txreceipt_status !== '0')
    .map(tx => tx.hash)

  await Promise.all(txs.map(hash => postTx(networkId, hash)))

  res.json({ result: txs })
}

async function postTx(networkId, hash) {
  const response = await fetch(`${relayer}/transaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ networkId, hash })
  })
  return await response.json()
}

async function retrieveZksync(address, page, size) {
  const query = `?limit=${size}&direction=older&contractAddress=${address}&offset=${(page - 1) * size}`
  const url = API_HOSTS.zksync + query
  const response = await fetch(url)
  const json = await response.json()
  const txs = json.list
    .map(tx => tx.transactionHash)

  return txs
}

async function retrieveAptos(page, size) {
  const body = {
    "operationName": "AccountTransactionsData",
    "variables": {
      "address": "0x8f572e334b2f8db2cb95be76962c71a19bbb3565e5b83e27b75ade87011a913b",
      "limit": size,
      "offset": 700
    },
    "query": "query AccountTransactionsData($address: String, $limit: Int, $offset: Int) {\n  move_resources(\n    where: {address: {_eq: $address}}\n    order_by: {transaction_version: desc}\n    distinct_on: transaction_version\n    limit: $limit\n    offset: $offset\n  ) {\n    transaction_version\n    __typename\n  }\n}"
  }
  const response = await fetch(API_HOSTS.aptos, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  const json = await response.json()
  return json.data.move_resources.map(item => item.transaction_version)
}

async function retrieveSui(page, size) {
  const body = {
    "jsonrpc": "2.0",
    "id": "",
    "method": "suix_queryTransactionBlocks",
    "params": [
      {
        "filter": {
          "FromAddress": "0xead52c0562a126c43fbc5e5a9d37757274e1c9d11531a23c0fc521a94bb0b5bc"
        },
        "options": {
          "showEffects": true,
          "showBalanceChanges": true,
          "showInput": true
        }
      },
      null,
      size,
      true
    ],
  }
  const response = await fetch(API_HOSTS.sui, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  const json = await response.json()
  return json.result.data.map(item => item.digest)
}
