import React from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'

import fetcher from 'lib/fetcher'
import { getAllNetworks } from 'lib/swap'

import Card, { CardTitle, CardBody } from 'components/Card'
import Table from 'components/Table'
import LoadingScreen from 'components/LoadingScreen'
import ButtonGroup from 'components/ButtonGroup'
import TagNetwork from 'components/TagNetwork'

import { StatTableRow } from './components'

export default function MonthlyStats() {
  const router = useRouter()
  const { param } = router.query
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
      router.replace('/stats/monthly')
    } else if (!['from', 'to', 'both'].includes(type)) {
      // router.replace(`/stats/${key}`)
    }
  })

  const queryUrl = React.useMemo(() => {
    let queryUrl = 'stats/monthly'
    if (chain !== 'all') {
      queryUrl += `/${shortCoinType}`
      if (type !== 'both') {
        queryUrl += `/${type}`
      }
    }
    return queryUrl
  }, [chain, shortCoinType, type])

  const { data, error } = useSWR(queryUrl, fetcher)

  const updatePathname = React.useCallback((chain, type) => {
    let pathname = `/stats/monthly`
    if (chain && chain !== 'all') {
      pathname += `/${chain}`
      if (type !== 'both') {
        pathname += `/${type}`
      }
    }
    const { param, ...query } = router.query
    router.push({ pathname, query })
  }, [router])

  let body
  if (error) {
    body = <div className='py-6 px-4 sm:px-6 text-red-400'>{error.message}</div>
  } else if (!data) {
    body = <LoadingScreen />
  } else {
    const total = data.list.reduce((prev = {}, item) => {
      const { count, api, auto, m2, vol = {}, fee = {}, vol_btc, fee_btc, vol_eth, fee_eth, vol_bnb, fee_bnb } = item
      return {
        _id: 'Total',
        count: (prev.count || 0) + count,
        api: (prev.api || 0) + api,
        auto: (prev.auto || 0) + auto,
        m2: (prev.m2 || 0) + m2,
        vol: {
          usd: (prev.vol?.usd || 0) + (vol.usd || 0),
          eth: (prev.vol?.eth || 0) + (vol.eth || 0),
          btc: (prev.vol?.btc || 0) + (vol.btc || 0),
          bnb: (prev.vol?.bnb || 0) + (vol.bnb || 0),
        },
        fee: {
          usd: (prev.fee?.usd || 0) + (fee.usd || 0),
          eth: (prev.fee?.eth || 0) + (fee.eth || 0),
          btc: (prev.fee?.btc || 0) + (fee.btc || 0),
          bnb: (prev.fee?.bnb || 0) + (fee.bnb || 0),
        },
      }
    })
    body = (
      <Table
        size='lg'
        headers={[
          { name: 'Month', width: '5%' },
          { name: '#Swaps', width: '8%', size: 'xs', className: 'text-right' },
          { name: '#API', width: '4%', size: 'xs', className: 'text-right' },
          { name: '#Auto', width: '4%', size: 'xs', className: 'text-right' },
          { name: '#M2', width: '4%', size: 'xs', className: 'text-right' },
          { name: 'USD Vol', width: '12%', size: 'xs', className: 'text-right' },
          { name: 'USD Fee', width: '6%', size: 'xs', className: 'text-right' },
          { name: 'BTC Vol', width: '10%', size: 'xs', className: 'text-right' },
          { name: 'BTC Fee', width: '6%', size: 'xs', className: 'text-right' },
          { name: 'ETH Vol', width: '10%', size: 'xs', className: 'text-right' },
          { name: 'ETH Fee', width: '6%', size: 'xs', className: 'text-right' },
          { name: 'BNB Vol', width: '10%', size: 'xs', className: 'text-right' },
          { name: 'BNB Fee', width: '6%', size: 'xs', className: 'text-right' },
          { name: 'Addrs', width: '9%', size: 'xs', className: 'pr-4 sm:pr-6 text-right' },
        ]}
      >
        <StatTableRow data={total} />
        {data.list.map(row => <StatTableRow key={row._id} data={row} />)}
      </Table>
    )
  }

  return (
    <Card>
      <CardTitle
        title='Monthly Stats'
        subtitle='Data summary by month'
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
        // tabs={tabs.map(t => ({
        //   ...t,
        //   active: t.key === chain,
        //   onClick: () => updatePathname(t.key, type, token)
        // }))}
      />
      <CardBody>{body}</CardBody>
    </Card>
  )
}
