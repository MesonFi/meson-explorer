import React from 'react'
import { useRouter } from 'next/router'

import Card, { CardTitle, CardBody } from 'components/Card'
import LoadingScreen from 'components/LoadingScreen'
import Button from 'components/Button'

import { LPS_BY_NETWORK, EXTRA_LPS } from 'lib/const'
import fetcher from 'lib/fetcher'
import { abbreviate } from 'lib/swap'
import useDealer from 'lib/useDealer'

import { LpContent } from './components'

export default function LpPage() {
  const router = useRouter()
  const { dealer } = useDealer()

  let body = <CardBody><LoadingScreen /></CardBody>
  if (dealer) {
    body = (
      <CardBody border={false} className='overflow-x-auto'>
        <LpContent addressByNetwork={LPS_BY_NETWORK} dealer={dealer} />
      </CardBody>
    )
  }

  const restartLp = async () => {
    await fetcher.post(`admin/server/restart`, { service: 'lp' })
    window.alert('LP service restarted!')
  }

  const restartRelayer = async () => {
    await fetcher.post(`admin/server/restart`, { service: 'relayer' })
    window.alert('Relayer restarted! LP service will restart after 20 seconds.')
    setTimeout(restartLp, 20000)
  }

  return (
    <Card>
      <CardTitle
        title='Liquidity Pools'
        subtitle='General view of pool balances'
        tabs={[
          { key: 'general', name: 'General', active: true },
          ...EXTRA_LPS.map(lp => ({
            key: lp,
            name: abbreviate(lp, 4, 0),
            onClick: () => router.push(`/lp/${lp}`)
          })),
          { key: 'whitelist', name: 'Whitelist', onClick: () => router.push(`/lp/whitelist`) }
        ]}
        right={
          <div className='flex gap-1'>
            <Button size='sm' color='info' rounded onClick={() => restartLp()}>Restart LP</Button>
            <Button size='sm' color='info' rounded onClick={() => restartRelayer()}>Restart Relayer</Button>
          </div>
        }
      />
      {body}
    </Card>
  )
}
