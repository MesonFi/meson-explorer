import classnames from 'classnames'
import Image from 'next/image'

import { getExplorerTokenLink } from 'lib/swap'

import btc from './btc.png'
import eth from './eth.png'
import bnb from '../TagNetwork/bnb.png'
import sol from '../TagNetwork/solana.png'
import cfx from '../TagNetwork/cfx.png'
import usdc from './usdc.png'
import usdt from './usdt.png'
import busd from './busd.png'
import cusd from './cusd.png'
import iusd from './iusd.png'
import tomo_cusd from './tomo_cusd.png'
import dai from './dai.png'
import pod from './pod.png'
import uct from './uct.png'
import zbc from './zbc.png'
import eos from './eos.png'
import sfuel from './skale.png'

function getTokenIcon(symbol) {
  if (symbol.indexOf('BTC') > -1) {
    return btc
  } else if (symbol.indexOf('ETH') > -1) {
    return eth
  } else if (symbol.indexOf('BNB') > -1) {
    return bnb
  } else if (symbol.indexOf('SOL') > -1) {
    return sol
  } else if (symbol.indexOf('USDC') > -1 || symbol.indexOf('USDbC') > -1) {
    return usdc
  } else if (symbol.indexOf('USDT') > -1) {
    return usdt
  } else if (symbol.indexOf('BUSD') > -1) {
    return busd
  } else if (symbol.indexOf('USDB') > -1) {
    return usdb
  } else if (symbol.indexOf('cUSD') > -1) {
    return cusd
  } else if (symbol.indexOf('CUSD') > -1) {
    return tomo_cusd
  } else if (symbol.indexOf('iUSD') > -1) {
    return iusd
  } else if (symbol.indexOf('USD') > -1 || symbol.indexOf('STABLECOINS') > -1) {
    return { component: <div className='w-full h-full rounded-full bg-primary flex items-center justify-center text-xs font-light text-white'>$</div> }
  } else if (symbol.indexOf('PoD') > -1) {
    return pod
  } else if (symbol.indexOf('UCT') > -1) {
    return uct
  } else if (symbol.indexOf('ZBC') > -1) {
    return zbc
  } else if (symbol.indexOf('EOS') > -1) {
    return eos
  } else if (symbol.indexOf('CFX') > -1) {
    return cfx
  } else if (symbol.indexOf('sFUEL') > -1) {
    return sfuel
  } else {
    return null
  }
}

export default function TagNetworkToken ({ responsive, size = 'sm', explorer, token, iconOnly, className }) {
  if (!token?.symbol) {
    return null
  }
  const icon = getTokenIcon(token.symbol)
  if (!icon) {
    return null
  }
  const tokenLink = getExplorerTokenLink(token)
  const href = explorer && `${explorer}/${tokenLink}`
  return (
    <div className={classnames('flex items-center text-gray-500', href && 'cursor-pointer hover:text-primary hover:underline', className)}>
      <a
        href={href}
        className={classnames('flex items-center rounded-full shadow', size === 'md' ? 'w-5 h-5' : 'w-4 h-4')}
        target='_blank'
        rel='noreferrer'
      >
        {icon?.component || <Image src={icon} alt='' />}
      </a>
      {
        !iconOnly &&
        <a
          href={href}
          className={classnames('text-xs mt-px', responsive ? 'hidden lg:flex lg:ml-1' : 'flex ml-1')}
          target='_blank'
          rel='noreferrer'
        >
          {token.symbol}
        </a>
      }
    </div>
  )
}