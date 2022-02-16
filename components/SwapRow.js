import React from 'react'
import classnames from 'classnames'
import Link from 'next/link'
import { ethers } from 'ethers'
import { ExternalLinkIcon } from '@heroicons/react/outline'

import socket from '../lib/socket'
import { parseNetworkAndToken, abbreviate, badgeClassnames, getSwapDuration } from '../lib/swap'

export default function SwapRow({ swap }) {
  const [status, setStatus] = React.useState(swap.status)
  const [recipient, setRecipient] = React.useState(swap.recipient)

  const from = parseNetworkAndToken(swap.inChain, swap.inToken)
  const to = parseNetworkAndToken(swap.outChain, swap.outToken)

  React.useEffect(() => {
    if (!from || !to || swap.status === 'DONE') {
      return
    }

    const swapUpdateListener = updates => {
      if (updates.status) {
        setStatus(updates.status)
      }
      if (updates.recipient) {
        setRecipient(updates.recipient)
      }
    }

    return socket.subscribe(swap._id, swapUpdateListener)
  }, [swap._id])

  if (!from || !to) {
    return null
  }

  return (
    <tr>
      <td className='py-4 pl-4 pr-3 sm:pl-6 whitespace-nowrap'>
        <div className="text-primary hover:underline">
          <Link href={`/swap/${swap._id}`}>{abbreviate(swap._id, 8, 8)}</Link>
        </div>
        <div className="text-xs text-gray-500">
          {new Date(swap.created).toLocaleString()}
        </div>
      </td>
      <td className='px-3 py-4 whitespace-nowrap'>
        <span className={classnames(
          'px-2 inline-flex text-sm leading-5 rounded-full',
          badgeClassnames(status)
        )}>
          {status}
        </span>
      </td>
      <td className='px-3 py-4 whitespace-nowrap'>
        <div className="text-primary hover:underline">
          <Link href={`/address/${swap.initiator}`}>{abbreviate(swap.initiator)}</Link>
        </div>
        <div className="flex items-center text-xs text-gray-500">
          {from.networkName}
          <a href={`${from.explorer}/address/${swap.initiator}`} className='inline-flex items-center' target='_blank' rel='noreferrer'>
            <ExternalLinkIcon className='inline-block w-4 ml-1 hover:text-primary' aria-hidden='true' />
          </a>
        </div>
      </td>
      <td className='px-3 py-4 whitespace-nowrap'>
        <div className='text-primary hover:underline'>
          <Link href={`/address/${recipient}`}>{recipient ? abbreviate(recipient) : ''}</Link>
        </div>
        <div className="flex items-center text-xs text-gray-500">
          {to.networkName}
          {
            recipient &&
            <a href={`${to.explorer}/address/${recipient}`}  className='inline-flex items-center' target='_blank' rel='noreferrer'>
              <ExternalLinkIcon className='inline-block w-4 ml-1 hover:text-indigo-500' aria-hidden='true' />
            </a>
          }
        </div>
      </td>
      <td className='px-3 py-4 whitespace-nowrap'>
        <div className='text-black'>
          {ethers.utils.formatUnits(swap.amount, 6)}{' '}
          <a
            className='text-sm text-black hover:text-indigo-500 hover:underline'
            href={`${from.explorer}/token/${from.token.addr}`}
            target='_blank'
            rel='noreferrer'
          >
            {from.token.symbol}
          </a>
          <span className='text-sm text-gray-500'>{' -> '}</span>
          <a
            className='text-sm text-black hover:text-indigo-500 hover:underline'
            href={`${to.explorer}/token/${to.token.addr}`}
            target='_blank'
            rel='noreferrer'
          >
            {to.token.symbol}
          </a>
        </div>
        <div className="text-xs text-gray-500">Fee: {ethers.utils.formatUnits(swap.fee, 6)} {from.token.symbol}</div>
      </td>
      <td className='px-3 py-4 whitespace-nowrap'>
        <span className='text-black'>
          {getSwapDuration(swap)}
        </span>
      </td>
    </tr>
  )
}
