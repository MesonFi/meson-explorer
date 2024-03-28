import { ethers } from 'ethers'
import mesonPresets from '@mesonfi/presets'
import { TESTNET } from './const'

mesonPresets.useTestnet(TESTNET)

export const presets = mesonPresets

export function getSwapId (encoded, initiator) {
  const packed = ethers.utils.solidityPack(['bytes32', 'address'], [encoded, initiator])
  return ethers.utils.keccak256(packed)
}

export function getAllNetworks() {
  return mesonPresets.getAllNetworks()
}

export function getExtType(coinType) {
  const network = mesonPresets.getNetworkFromShortCoinType(coinType)
  if (!network) {
    return 'metamask'
  }
  return network.extensions[0]
}

export function abbreviate(str, pre = 6, post = pre) {
  if (!str) {
    return ''
  }
  if (str.startsWith('0x')) {
    pre += 2
  }
  const len = str.length
  return `${str.substr(0, pre)}...${str.substr(len - post)}`
}

const EventNames = [
  'REQUESTING',
  'DIRECT-SWAP',
  'POSTED',
  'BONDED',
  'LOCKED',
  'UNLOCKED',
  'RELEASING',
  'EXECUTED',
  'CANCELLED',
  'RELEASED',
]

export function getMaxEvent(events) {
  return EventNames[Math.max(...events
    .filter(e => !e.name.endsWith(':FAILED'))
    .map(e => EventNames.indexOf(e.name))
  )]
}

export function sortEvents(events) {
  if (!events) {
    return []
  }
  return events
    .map(e => ({ ...e, index: EventNames.indexOf(e.name.split(':')[0]) }))
    .sort((a, b) => a.index - b.index)
}

export const FailedStatus = [
  'DROPPED',
  'EXPIRED',
  'EXPIRED*',
  'CANCELLED',
  'CANCELLED*'
]

export const CancelledStatus = [
  'DROPPED',
  'CANCELLED',
  'CANCELLED*'
]

export function getStatusFromEvents(events, expireTs, temp) {
  if (temp) {
    return 'PENDING'
  }
  if (!events?.length) {
    return ''
  }
  const started = events.filter(e => ['POSTED', 'BONDED', 'LOCKED'].includes(e.name)).length > 0
  const locks = events.filter(e => e.name === 'LOCKED')
  const processed = events.filter(e => ['RELEASED', 'UNLOCKED'].includes(e.name))
  const suffix = locks.length > processed.length ? '*' : ''

  const expired = (started ? expireTs : (expireTs - 3600)) < Date.now() / 1000
  const maxEvent = getMaxEvent(events)
  if (maxEvent === 'RELEASED') {
    if (!events.find(e => e.name === 'EXECUTED')) {
      return 'RELEASED' + suffix
    } else {
      return 'DONE' + suffix
    }
  } else if (maxEvent === 'CANCELLED') {
    return 'CANCELLED' + suffix
  } else if (maxEvent === 'EXECUTED') {
    if (events.find(e => e.name === 'DIRECT-SWAP') && !events.find(e => e.name === 'RELEASED:PENDING')) {
      return 'RELEASING...'
    } else {
      return 'RELEASING*'
    }
  } else if (expired) {
    if (!maxEvent || maxEvent === 'REQUESTING' || !started) {
      return 'DROPPED'
    } else if (!['RELEASED', 'CANCELLED'].includes(maxEvent)) {
      return 'EXPIRED' + suffix
    }
  } else if (maxEvent === 'RELEASING') {
    return 'RELEASING'
  } else if (suffix) {
    return 'LOCKED'
  } else if (maxEvent === 'DIRECT-SWAP') {
    return 'REQUESTING'
  }
  return maxEvent || 'DROPPED'
}

export function getDuration(t1, t2) {
  if (!t2) {
    return '-'
  }
  const diff = new Date(t2) - new Date(t1)
  return formatDuration(diff)
}

export function formatDuration(diff) {
  if (!diff) {
    return ''
  } else if (diff < 1000) {
    return '-'
  }
  const duration = new Date(diff)
  const hh = duration.getUTCHours().toString().padStart(2, '0')
  const mm = duration.getUTCMinutes().toString().padStart(2, '0')
  const ss = duration.getSeconds().toString().padStart(2, '0')
  if (hh === '00') {
    return `${mm}:${ss}`
  }
  return `${hh}:${mm}:${ss}`
}

export function formatDate(t) {
  const date = new Date(t)
  const YYYY = date.getUTCFullYear().toString()
  const MM = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const DD = date.getUTCDate().toString().padStart(2, '0')
  return `${YYYY}/${MM}/${DD}`
}

export function getExplorerTxLink(network, hash) {
  if (!network) {
    return ''
  } else if (network.id.startsWith('tron')) {
    return `${network.explorer}/transaction/${hash}`
  } else if (network.id.startsWith('aptos')) {
    return `${network.explorer}/txn/${hash}?network=${TESTNET ? 'testnet' : 'mainnet'}`
  } else if (network.id.startsWith('sui')) {
    return `${network.explorer}/tx/${hash}`
  } else if (network.id.startsWith('solana')) {
    return `${network.explorer}/tx/${hash}?cluster=${TESTNET ? 'testnet' : 'mainnet'}`
  } else {
    return `${network.explorer}/tx/${hash}`
  }
}

export function getExplorerAddressLink(network, addr) {
  if (network.id.startsWith('aptos')) {
    return `${network.explorer}/account/${addr}?network=${TESTNET ? 'testnet' : 'mainnet'}`
  } else if (network.id.startsWith('sui')) {
    return `${network.explorer}/account/${addr}`
  } else if (network.id.startsWith('solana')) {
    return `${network.explorer}/address/${addr}?cluster=${TESTNET ? 'testnet' : 'mainnet'}`
  } else if (network.id.startsWith('starknet')) {
    return `${network.explorer}/contract/${addr}`
  } else {
    return `${network.explorer}/address/${addr}`
  }
}

export function getExplorerTokenLink(token) {
  return token.link || (token.addr ? `token/${token.addr}` : '')
}
