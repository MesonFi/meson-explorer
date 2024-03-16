import React from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'

import useSWR from 'swr'
import fetcher from 'lib/fetcher'

import PagiCard from 'components/Pagi/PagiCard'
import SwapRow from 'components/SwapRow'
import Button from 'components/Button'
import Badge from 'components/Badge'

export default function AddressSwapList() {
  const router = useRouter()
  const { address, ...rest } = router.query

  const { data: session } = useSession()
  const roles = session?.user?.roles || []
  const checkPremium = roles.some(r => ['root', 'admin', 'operator'].includes(r))
  const authorized = roles.some(r => ['root', 'admin'].includes(r))

  const { data } = useSWR(checkPremium && `admin/premium/${address}`, fetcher)
  let premiumBadge = null
  if (data?.list) {
    const now = Date.now() / 1000
    const valid = data.list.find(item => item.since < now && now < item.until)
    premiumBadge = <Badge type={valid ? 'warning' : 'default'} className='mr-1' onClick={() => router.push(`/premium/${address}`)}>PREMIUM</Badge>
  }

  const toggleFailed = React.useCallback(() => {
    const query = router.query
    if (query.failed) {
      delete query.failed
    } else {
      query.failed = 'true'
    }
    router.push({ query })
  }, [router])

  let queryUrl
  if (address) {
    queryUrl = `address/${address}/swap`
    if (rest.failed) {
      queryUrl += '?failed=true'
    }
  }

  const exportSwaps = React.useCallback(() => {
    window.open(`/api/v1/address/${address}/export`, '_blank')
  }, [address])

  return (
    <PagiCard
      title='Swaps for Address'
      badge={authorized && <Button size='sm' rounded color={rest.failed && 'error'} onClick={toggleFailed}>Failed</Button>}
      right={authorized && <Button rounded size='sm' color='info' onClick={exportSwaps}>Export</Button>}
      subtitle={<div className='flex items-center'>{premiumBadge}{address}</div>}
      queryUrl={queryUrl}
      fallback={`/address/${address}`}
      tableHeaders={[
        { name: 'swap id / time', width: '18%', className: 'hidden sm:table-cell' },
        { name: 'swap id', width: '18%', className: 'pl-4 sm:hidden' },
        { name: 'status', width: '10%', className: 'hidden sm:table-cell' },
        { name: 'from', width: '18%' },
        { name: 'to', width: '18%' },
        { name: 'amount', width: '18%' },
        { name: 'fee', width: '9%', className: 'hidden md:table-cell' },
        { name: 'duration', width: '9%', className: 'hidden lg:table-cell' }
      ]}
      Row={SwapRow}
    />
  )
}
