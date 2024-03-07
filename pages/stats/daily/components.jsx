import React from 'react'
import useSWR from 'swr'
import { ethers } from 'ethers'

import fetcher from 'lib/fetcher'
import { formatDuration } from 'lib/swap'
import { StatCard } from 'components/Card'
import { Td } from 'components/Table'

const fmt = Intl.NumberFormat()

export function GeneralStats() {
  const { data: generalData } = useSWR(`stats/general`, fetcher)

  const { success, count, volume, duration, addresses } = generalData || {}
  const nSuccess = success ? fmt.format(success) : '-'
  const nTotal = count ? fmt.format(count) : '-'
  const rate = (success > 1 && count > 1) ? <span className='text-gray-500 text-sm'>({Math.floor(success / count * 1000) / 10}%)</span> : ''

  return (
    <div className='grid md:grid-cols-4 grid-cols-2 md:gap-5 gap-3 md:mb-5 mb-3'>
      <StatCard title='# of Swaps' value={<>{nSuccess} / {nTotal} {rate}</>} />
      <StatCard title='# of Addresses' value={addresses || 'N/A'} />
      <StatCard title='Total Volume' value={volume ? `$${fmt.format(Math.floor(ethers.utils.formatUnits(volume, 6)))}` : 'N/A'} />
      <StatCard title='Avg. Duration' value={duration ? formatDuration(duration * 1000) : 'N/A'} />
    </div>
  )
}

export function StatTableRow({ data, token }) {
  const { _id: date, count, success, api, auto, m2, a2, volume = 0, srFee, lpFee, addresses, duration } = data
  const volumeStr = valueInStr(volume, token)
  const srFeeStr = valueInStr(srFee, token, true)
  const lpFeeStr = valueInStr(lpFee, token, true)
  const avgSwapAmount = success ? valueInStr(Math.floor(volume / success), token) : ''

  return (
    <tr className='odd:bg-white even:bg-gray-50 hover:bg-primary-50'>
      <Td size='' className='pl-4 pr-3 sm:pl-6 py-1 text-sm'>{date}</Td>
      <Td size='xs' className='font-mono'><SwapCount count={count} success={success} /></Td>
      <Td size='xs' className='font-mono'><SwapCount {...api} /></Td>
      <Td size='xs' className='font-mono'><SwapCount {...auto} /></Td>
      <Td size='xs' className='font-mono'><SwapCount {...m2} /></Td>
      {/* <Td size='sm'><SwapCount {...a2} /></Td> */}
      <Td size='xs' className='font-mono text-right'>{addresses}</Td>
      {
        token &&
        <>
          <Td size='xs' className='font-mono text-right'>{volumeStr}</Td>
          <Td size='xs' className='font-mono text-right'>{srFeeStr}</Td>
          <Td size='xs' className='font-mono text-right'>{lpFeeStr}</Td>
          <Td size='xs' className='font-mono text-right'>{avgSwapAmount}</Td>
        </>
      }
      <Td size='xs' className='pr-4 sm:pr-6 font-mono text-right'>{formatDuration(duration * 1000)}</Td>
    </tr>
  )
}

export function valueInStr (value = 0, symbol, k = false) {
  if (symbol === 'eth') {
    return `${Number(ethers.utils.formatUnits(value, 6)).toFixed(3)}🔹`
  } else if (symbol === 'btc') {
    return <div className='inline-flex items-center'>{Number(ethers.utils.formatUnits(value, 6)).toFixed(3)}<span className='text-[80%] ml-0.5'>🫓</span></div>
  } else if (symbol === 'bnb') {
    return `${Number(ethers.utils.formatUnits(value, 6)).toFixed(3)}🔸`
  }
  const amount = Math.floor(ethers.utils.formatUnits(value, 6))
  if (amount > 5e5) {
    return <><span className='text-gray-500 mr-0.5'>$</span>{fmt.format(amount).padStart(10, String.fromCharCode(160))}</>
  }
  return <><span className='text-gray-500 mr-0.5'>$</span>{fmt.format(amount).padStart(7, String.fromCharCode(160))}</>
}

function SwapCount({ count, success }) {
  if (!count) {
    return null
  }
  const countStr = (count > 100000 ? Math.floor(count / 1000) + 'k' : `${count}`).padStart(5, String.fromCharCode(160))
  const successStr = (success > 100000 ? Math.floor(success / 1000) + 'k' : `${success}`).padStart(5, String.fromCharCode(160))
  return <span>{successStr}<span className='text-gray-500 ml-1 mr-0.5'>/</span>{countStr} <span className='text-gray-500'>({Math.floor(success / count * 1000) / 10}%)</span></span>
}
