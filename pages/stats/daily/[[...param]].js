import React from 'react'
import { useRouter } from 'next/router'

import PagiCard from 'components/Pagi/PagiCard'
import ButtonGroup from 'components/ButtonGroup'
import TagNetwork from 'components/TagNetwork'

import { getAllNetworks } from 'lib/swap'

import { GeneralStats, StatTableRow } from './components'

export default function DailyStats() {
  const router = useRouter()
  const { token = '', param } = router.query
  const chain = param ? param[0] : 'all'
  const type = (param && param[1]) || 'both'
  const tabs = React.useMemo(() => [
    { key: 'all', name: 'All Chains', shortCoinType: '' },
    ...getAllNetworks().map(n => ({
      key: n.id,
      name: n.name,
      display: <TagNetwork size='md' network={n} iconOnly />,
      shortCoinType: n.shortSlip44
    }))
  ], [])

  const selected = tabs.find(t => t.key === chain) || {}
  const { name, shortCoinType } = selected

  React.useEffect(() => {
    if (param && !shortCoinType) {
      router.replace('/stats/daily')
    } else if (!['from', 'to', 'both'].includes(type)) {
      // router.replace(`/stats/${key}`)
    }
  })

  const queryUrl = React.useMemo(() => {
    let queryUrl = 'stats/daily'
    if (chain !== 'all') {
      queryUrl += `/${shortCoinType}`
      if (type !== 'both') {
        queryUrl += `/${type}`
      }
    }
    if (token) {
      queryUrl += `?token=${token}`
    }
    return queryUrl
  }, [chain, shortCoinType, type, token])

  const updatePathname = React.useCallback((chain, type, token) => {
    let pathname = `/stats/daily`
    if (chain && chain !== 'all') {
      pathname += `/${chain}`
      if (type !== 'both') {
        pathname += `/${type}`
      }
    }
    const { param, ...query } = router.query
    if (token) {
      query.token = token
    } else {
      delete query.token
    }
    router.push({ pathname, query })
  }, [router])

  const StatTableRowByToken = React.useCallback(({ data }) => StatTableRow({ data, token }), [token])

  const reducer = (_prev, item) => {
    const prev = _prev || {}
    const { count, success, api, auto, m2, a2, volume, srFee, lpFee } = item
    return {
      _id: 'Total',
      count: (prev.count || 0) + count,
      success: (prev.success || 0) + success,
      api: { count: (prev.api?.count || 0) + api.count, success: (prev.api?.success || 0) + api.success },
      auto: { count: (prev.auto?.count || 0) + auto.count, success: (prev.auto?.success || 0) + auto.success },
      m2: { count: (prev.m2?.count || 0) + m2.count, success: (prev.m2?.success || 0) + m2.success },
      // a2: { count: (prev.a2?.count || 0) + a2.count, success: (prev.a2?.success || 0) + a2.success },
      volume: (prev.volume || 0) + volume,
      srFee: (prev.srFee || 0) + srFee,
      lpFee: (prev.lpFee || 0) + lpFee,
      duration: 0
    }
  }

  return (
    <>
      <GeneralStats />
      <PagiCard
        title='Daily Swaps'
        badge={shortCoinType &&
          <ButtonGroup
            size='sm'
            active={type}
            buttons={[
              { key: 'both', text: `All` },
              { key: 'from', text: `From` },
              { key: 'to', text: `To` }
            ]}
            onChange={type => updatePathname(chain, type, token)}
          />
        }
        right={
          <ButtonGroup
            size='sm'
            active={token}
            buttons={[
              { key: '', text: `All` },
              { key: 'usd', text: `Stablecoins` },
              { key: 'eth', text: `ETH` },
              { key: 'btc', text: `BTC` },
              { key: 'bnb', text: `BNB` },
            ]}
            onChange={token => updatePathname(chain, type, token)}
          />
        }
        tabs={tabs.map(t => ({
          ...t,
          active: t.key === chain,
          onClick: () => updatePathname(t.key, type, token)
        }))}
        queryUrl={queryUrl}
        fallback='/stats/daily'
        reducer={reducer}
        noSize
        tableHeaders={[
          { name: 'Date', width: '8%' },
          { name: '# success / total', size: 'xs', width: '11%' },
          { name: '# API swaps', size: 'xs', width: '11%' },
          { name: '# Auto swaps', size: 'xs', width: '11%' },
          { name: '# meson.to swaps', size: 'xs', width: '11%' },
          // { name: '# alls.to swaps', width: '10%' },
          { name: 'Addrs', width: '8%', size: 'xs', className: 'text-right' },
          { name: 'Avg. Dur.', width: '8%', size: 'xs', className: 'text-right' + (token ? '' : ' pr-4 sm:pr-6') },
          ...(token && [
            { name: 'Avg. Amount', width: '8%', size: 'xs', className: 'text-right' },
            { name: 'Volume', width: '8%', size: 'xs', className: 'text-right' },
            { name: 'Sr Fee', width: '8%', size: 'xs', className: 'text-right' },
            { name: 'LP Fee', width: '8%', size: 'xs', className: 'pr-4 sm:pr-6 text-right' },
          ]),
        ]}
        Row={StatTableRowByToken}
      />
    </>
  )
}
