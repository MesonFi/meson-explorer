import React from 'react'
import { useRouter } from 'next/router'

import { presets } from 'lib/swap'
import Card, { CardTitle, CardBody } from 'components/Card'
import SwapStatusBadge from 'components/SwapStatusBadge'
import ListRow from 'components/ListRow'
import TagNetwork from 'components/TagNetwork'

import { EncodedSplitted, SwapSaltBadges, SwapAmountAndFeeDisplay } from '../swap/[idOrEncoded]'


export default function DecodeSwap() {
  const router = useRouter()
  try {
    const { swap, from, to } = presets.parseInOutNetworkTokens(router.query.encoded)
    return (
      <Card>
        <CardTitle
          title='Swap Decoder'
          subtitle={router.query.encoded}
        />
        <CardBody border={false}>
          <dl>
            <ListRow title='Encoded As'>
              <EncodedSplitted swap={swap} />
              {!swap.version && <div className='text-sm text-gray-500'>v0 encoding</div>}
              <SwapSaltBadges swap={swap} />
            </ListRow>
            <ListRow title='Route'>
              <div className='flex items-center'>
                <TagNetwork network={from.network} />
                <div className='text-sm text-gray-500 mx-1'>{'->'}</div>
                <TagNetwork network={to.network} />
              </div>
            </ListRow>
            <SwapAmountAndFeeDisplay swap={swap} from={from} to={to} />
            <ListRow title='Expires at'>
              {new Date(swap.expireTs * 1000).toLocaleString()}
            </ListRow>
          </dl>
        </CardBody>
      </Card>
    )
  } catch {}

  return (
    <Card>
      <CardTitle
        title='Swap Decoder'
        badge={<SwapStatusBadge error />}
        subtitle={router.query.encoded}
      />
      <CardBody border={false}>
        <dl>
          <ListRow title='Error'>
            <div className='break-all'>Not a valid encoded swap</div>
          </ListRow>
        </dl>
      </CardBody>
    </Card>
  )
}