import React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import debounce from 'lodash/debounce'

import socket from 'lib/socket'
import { presets, abbreviate, getDuration } from 'lib/swap'

import { Td } from './Table'
import SwapStatusBadge from './SwapStatusBadge'

import TagNetwork from './TagNetwork'
import TagNetworkToken from './TagNetworkToken'
import AmountDisplay from './AmountDisplay'

export default function SwapRow({ data: raw, smMargin }) {
  const router = useRouter()
  const [data, setData] = React.useState(raw)
  React.useEffect(() => { setData(raw) }, [raw])

  const mouseJustDown = React.useRef(false)
  const handleMouse = React.useMemo(() => debounce(evt => {
    if (evt.detail > 1 || evt.type !== 'mouseup' || !mouseJustDown.current) {
      return
    }
    const tag = evt?.target?.tagName?.toLowerCase()
    if (!['a', 'img', 'svg', 'path'].includes(tag)) {
      if (evt.button === 0) {
        if (!evt.shiftKey) {
          router.push(`/swap/${swapId}`)
        }
      } else if (evt.button === 1) {
        window.open(`/swap/${swapId}`, '_blank')
      }
    }
  }, 250), [router, swapId])

  const swapUpdateListener = React.useCallback(({ status, data } = {}) => {
    setData(prev => {
      const updates = {}
      if (!data.hash || !prev.events.find(e => e.hash === data.hash)) {
        updates.events = [...prev.events, { name: status, ...data }]
      }
      if (!data.failed) {
        if (status === 'RELEASED') {
          updates.released = data.ts * 1000
        } else if (status === 'EXECUTED') {
          updates.executed = data.ts * 1000
        }
        if (data.provider) {
          updates.provider = data.provider
        } else if (data.provider) {
          updates.fromTo = [prev.fromTo[0], data.recipient]
        }
      }
      if (Object.keys(updates).length) {
        return { ...prev, ...updates }
      }
      return prev
    })
  }, [])

  const { swap, from, to } = React.useMemo(() => presets.parseInOutNetworkTokens(data.encoded), [data.encoded])
  const expired = swap?.expireTs < Date.now() / 1000

  const swapId = data?._id
  const noSubscribe = !from || !to || (data.released && data.events.find(e => e.name === 'EXECUTED'))
  React.useEffect(() => {
    if (!swapId || noSubscribe) {
      return
    }
    return socket.subscribe(swapId, swapUpdateListener)
  }, [swapId, noSubscribe, swapUpdateListener])

  if (!from || !to) {
    return null
  }

  const fromAddress = data.fromTo[0] || data.initiator
  const recipient = data.fromTo[1] || ''
  return (
    <tr
      className='odd:bg-white even:bg-gray-50 hover:bg-primary-50'
      onMouseDown={evt => {
        mouseJustDown.current = true
        setTimeout(() => { mouseJustDown.current = false }, 500)
        handleMouse(evt)
      }}
      onMouseUp={handleMouse}
    >
      <Td size='' className={smMargin ? 'pl-3 md:pl-4 py-2' : 'pl-4 pr-3 sm:pl-6 py-2'}>
        <div className='text-primary hover:underline hidden lg:block'>
          <Link href={`/swap/${swapId}`}>{abbreviate(swapId)}</Link>
        </div>
        <div className='text-primary hover:underline hidden sm:inline-block lg:hidden'>
          <Link href={`/swap/${swapId}`}>{abbreviate(swapId, 6, 4)}</Link>
        </div>
        <div className='text-primary hover:underline sm:hidden'>
          <Link href={`/swap/${swapId}`}>{abbreviate(swapId, 6, 0)}</Link>
        </div>
        <div className='text-xs text-gray-500 hidden sm:block'>
          {new Date(data.created).toLocaleString()}
        </div>
        <div className='sm:hidden scale-75 origin-left'>
          <SwapStatusBadge events={data.events} expired={expired} className='text-xs' />
        </div>
      </Td>
      <Td className='hidden sm:table-cell'>
        <SwapStatusBadge events={data.events} expired={expired} />
      </Td>
      <Td>
        <TagNetwork responsive network={from.network} address={fromAddress} />
        <div className='text-normal hover:underline hover:text-primary hidden lg:inline-block'>
          <Link href={`/address/${fromAddress}`}>{abbreviate(fromAddress)}</Link>
        </div>
        <div className='text-normal hover:underline hover:text-primary hidden sm:inline-block lg:hidden'>
          <Link href={`/address/${fromAddress}`}>{abbreviate(fromAddress, 6, 4)}</Link>
        </div>
        <div className='text-normal hover:underline hover:text-primary sm:hidden'>
          <Link href={`/address/${fromAddress}`}>{abbreviate(fromAddress, 6, 0)}</Link>
        </div>
      </Td>
      <Td>
        <TagNetwork responsive network={to.network} address={recipient} />
        <div className='text-normal hover:underline hover:text-primary hidden lg:inline-block'>
          <Link href={`/address/${recipient}`}>{abbreviate(recipient)}</Link>
        </div>
        <div className='text-normal hover:underline hover:text-primary hidden sm:inline-block lg:hidden'>
          <Link href={`/address/${recipient}`}>{abbreviate(recipient, 6, 4)}</Link>
        </div>
        <div className='text-normal hover:underline hover:text-primary sm:hidden'>
          <Link href={`/address/${recipient}`}>{abbreviate(recipient, 6, 0)}</Link>
        </div>
      </Td>
      <Td>
        <div className='flex lg:flex-col'>
          <div className='mr-1'>
            <AmountDisplay value={swap.amount} decimals={swap.inToken === 255 ? 4 : 6} />
          </div>
          <div className='flex items-center'>
            <TagNetworkToken responsive explorer={from.network.explorer} token={from.token} />
            <div className='hidden md:flex'>
              <div className='text-gray-500 mx-1 text-xs'>{'->'}</div>
              <TagNetworkToken responsive explorer={to.network.explorer} token={to.token} />
            </div>
          </div>
        </div>
      </Td>
      <Td className='hidden md:table-cell'>
        <div className='flex items-center lg:flex-col lg:items-start'>
          <div className='mr-1'><AmountDisplay value={swap.totalFee} /></div>
          <TagNetworkToken responsive explorer={from.network.explorer} token={from.token} />
        </div>
      </Td>
      <Td className='hidden lg:table-cell'>
        <span className='text-gray-500'>
          {getDuration(data.created, data.released)}
        </span>
      </Td>
    </tr>
  )
}
