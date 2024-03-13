import React from 'react'
import classnames from 'classnames'
import { useRouter } from 'next/router'

import PagiCard from 'components/Pagi/PagiCard'
import ButtonGroup from 'components/ButtonGroup'
import TagNetwork from 'components/TagNetwork'
import { Td } from 'components/Table'

import { getAllNetworks } from 'lib/swap'

import { valueInStr } from './components'

const networks = getAllNetworks()

export default function DailyStatsByChain() {
  const router = useRouter()
  const [view, setView] = React.useState('volume')
  const { from, to } = router.query

  const queryUrl = React.useMemo(() => {
    let queryUrl = '/stats/daily/by-chain'
    if (from || to) {
      queryUrl += `?from=${from || ''}&to=${to || ''}`
    }
    return queryUrl
  }, [from, to])

  const headers = React.useMemo(() => {
    const headers = networks.map(n => ({ name: <TagNetwork size='md' network={n} iconOnly /> }))
    if (['swaps', 'fees', 'volume'].includes(view)) {
      headers.unshift({ name: 'Total' })
    }
    headers.unshift({ name: 'Date' })
    return headers
  }, [view])
  
  const StatByChainRowByView = React.useCallback(({ data }) => StatByChainRow({ data, view }), [view])

  return (
    <PagiCard
      title='Daily Swaps by Chain'
      right={
        <ButtonGroup
          size='sm'
          active={view}
          buttons={[
            { key: 'volume', text: `Volume ` },
            { key: 'swaps-graph', text: `#Swaps (graph)` },
            { key: 'swaps', text: `#Swaps` },
            { key: 'fees-graph', text: `Fees (graph)` },
            { key: 'fees', text: `Fees ` },
          ]}
          onChange={view => setView(view)}
        />
      }
      queryUrl={queryUrl}
      fallback={queryUrl}
      noSize
      tableHeaders={headers}
      Row={StatByChainRowByView}
    />
  )
}

function StatByChainRow ({ data, view = 'swaps' }) {
  const { _id: date, ...rest } = data
  const total = Object.values(rest).reduce((x, y) => {
    const tokens = ['stablecoins', 'eth', 'btc', 'bnb']
    return {
      from: tokens.map(t => ({
        tokenType: t,
        count: (x?.from?.find(item => item.tokenType === t)?.count || 0) + (y?.from?.find(item => item.tokenType === t)?.count || 0),
        success: (x?.from?.find(item => item.tokenType === t)?.success || 0) + (y?.from?.find(item => item.tokenType === t)?.success || 0),
        volume: (x?.from?.find(item => item.tokenType === t)?.volume || 0) + (y?.from?.find(item => item.tokenType === t)?.volume || 0),
        lpFee: (x?.from?.find(item => item.tokenType === t)?.lpFee || 0) + (y?.from?.find(item => item.tokenType === t)?.lpFee || 0),
        srFee: (x?.from?.find(item => item.tokenType === t)?.srFee || 0) + (y?.from?.find(item => item.tokenType === t)?.srFee || 0),
      })),
      to: tokens.map(t => ({
        tokenType: t,
        count: (x?.to?.find(item => item.tokenType === t)?.count || 0) + (y?.to?.find(item => item.tokenType === t)?.count || 0),
        success: (x?.to?.find(item => item.tokenType === t)?.success || 0) + (y?.to?.find(item => item.tokenType === t)?.success || 0),
        volume: (x?.to?.find(item => item.tokenType === t)?.volume || 0) + (y?.to?.find(item => item.tokenType === t)?.volume || 0),
        lpFee: (x?.to?.find(item => item.tokenType === t)?.lpFee || 0) + (y?.to?.find(item => item.tokenType === t)?.lpFee || 0),
        srFee: (x?.to?.find(item => item.tokenType === t)?.srFee || 0) + (y?.to?.find(item => item.tokenType === t)?.srFee || 0),
      })),
    }
  })
  const rows = networks.map(n => rest[n.shortSlip44])
  if (['swaps', 'fees', 'volume'].includes(view)) {
    rows.unshift(total)
  }

  const tds = rows.map((d, index) => {
    let content = null
    if (!d) {
      content = ''
    } else if (view === 'swaps') {
      content = (
        <div className={index ? 'w-10' : 'w-14'}>
          <StatsByChainCountTextCell data={d.from} />
          <div className='w-full my-px h-px bg-gray-500' />
          <StatsByChainCountTextCell data={d.to} />
        </div>
      )
    } else if (view === 'swaps-graph') {
      content = (
        <div className='w-10'>
          <StatsByChainCountLinesCell data={d.from} />
          <div className='w-full my-0.5 h-px bg-gray-500' />
          <StatsByChainCountLinesCell data={d.to} />
        </div>
      )
    } else if (view === 'fees') {
      content = (
        <div className={index ? 'w-12' : 'w-12'}>
          <StatsByChainFeesTextCell data={d.from} />
          <div className='w-full my-px h-px bg-gray-500' />
          <StatsByChainFeesTextCell data={d.to} />
        </div>
      )
    } else if (view === 'fees-graph') {
      content = (
        <div className='w-10'>
          <StatsByChainFeesLinesCell data={d.from} />
          <div className='w-full my-0.5 h-px bg-gray-500' />
          <StatsByChainFeesLinesCell data={d.to} />
        </div>
      )
    } else if (view === 'volume') {
      content = (
        <div className={index ? 'w-[52px]' : 'w-[72px]'}>
          <StatsByChainVolumeCell data={d.from} />
          <div className='w-full my-0.5 h-px bg-gray-500' />
          <StatsByChainVolumeCell data={d.to} />
        </div>
      )
    }
    return <Td key={`col-${index}`} size='narrow'>{content}</Td>
  })

  return (
    <tr className='odd:bg-white even:bg-gray-50 hover:bg-primary-50'>
      <Td size='' className='pl-4 pr-3 sm:pl-6 py-1 text-sm'>{date}</Td>
      {tds}
    </tr>
  )
}

const colors = {
  stablecoins: 'primary',
  eth: 'indigo-500',
  btc: 'warning',
  bnb: 'yellow-400'
}

function StatsByChainCountTextCell ({ data = [] }) {
  return (
    <div className='w-full flex flex-col gap-px'>
    {
      data.map((d, i) => {
        const fail = d.count - d.success
        return (
          <div key={i} className={classnames('flex justify-between text-[10px] leading-[10px]', `text-${colors[d.tokenType]}`)}>
            <div>{d.success}</div>
            {fail ? <div className='text-red-500'>{fail}</div> : ''}
          </div>
        )
      })
    }
    </div>
  )
}

function StatsByChainFeesTextCell ({ data = [] }) {
  return (
    <div className='w-full flex flex-col gap-px'>
    {
      data.map((d, i) => (
        <div key={i} className={classnames('font-mono text-[10px] leading-[10px]', `text-${colors[d.tokenType]}`)}>
          {valueInStr(d.lpFee + d.srFee, d.tokenType, 'short')}
        </div>
      ))
    }
    </div>
  )
}

function StatsByChainCountLinesCell ({ data = [] }) {
  return (
    <div className='w-10 flex flex-col gap-px'>
      {data.map((d, i) => <Lines key={i} value={d.count} bg={`bg-${colors[d.tokenType]}`} rate={1 - d.success/d.count} />)}
    </div>
  )
}

function StatsByChainFeesLinesCell ({ data = [] }) {
  return (
    <div className='w-10 flex flex-col gap-px'>
    {
      data.map((d, i) => {
        let display = (d.lpFee + d.srFee) / 1e6
        let value
        if (['eth', 'btc', 'bnb'].includes(d.tokenType)) {
          value = display * 1000
          display = display.toFixed(3)
        } else {
          value = display
          display = Math.round(display)
        }
        return <Lines key={i} value={value} display={display} bg={`bg-${colors[d.tokenType]}`} />
      })
    }
    </div>
  )
}

function StatsByChainVolumeCell ({ data = [] }) {
  return (
    <div className='w-full flex flex-col gap-px'>
    {
      data.filter(d => d.volume > 0).map((d, i) => (
        <div key={i} className={classnames('font-mono text-[10px] leading-[10px]', `text-${colors[d.tokenType]}`)}>
          {valueInStr(d.volume, d.tokenType, 'short')}
        </div>
      ))
    }
    </div>
  )
}

function Lines ({ value, display, bg, rate = 0 }) {
  const lines = Array(Math.ceil(value / 100)).fill(0)
  if (lines.length < 5) {
    return lines.map((_, i) => <Line key={`line-${i}`} value={value - 100 * i} bg={bg} rate={rate} />)
  }
  return <Line value={value} bg={bg} rate={rate}>{display || value}</Line>
}

function Line ({ value, bg, rate, children }) {
  return (
    <div className='w-10 overflow-hidden bg-gray-100'>
      <div
        className={classnames(
          'relative flex items-center max-w-full',
          !children && 'h-1.5',
          children && value < 1000 && 'h-4',
          children && value >= 1000 && value < 3000 && 'h-6',
          children && value >= 3000 && 'h-10',
          bg
        )}
        style={{ width: `${value / 2.5}px` }}
      >
        <div className='absolute top-0 right-0 h-full bg-red-500' style={{ width: `${rate * 100}%` }} />
        <div className='z-10 text-xs ml-1 text-white'>{children}</div>
      </div>
    </div>
  )
}
