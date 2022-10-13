import React from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'

import useSWR from 'swr'
import fetcher from 'lib/fetcher'

import PagiCard from 'components/Pagi/PagiCard'
import SwapRow from 'components/SwapRow'
import Badge from 'components/Badge'

export default function AddressSwapList() {
  const router = useRouter()
  const address = router.query.address

  const { data: session } = useSession()
  const roles = session?.user?.roles || []
  const checkPremium = roles.some(r => ['root', 'admin', 'operator'].includes(r))

  const { data } = useSWR(checkPremium && `admin/premium/${address}`, fetcher)
  const premium = data?.total
    ? <Badge type='warning' className='mr-1' onClick={() => router.push(`/premium/${address}`)}>PREMIUM</Badge>
    : null

  return (
    <PagiCard
      title='Swaps for Address'
      subtitle={<div className='flex items-center'>{premium}{address}</div>}
      queryUrl={`address/${address}/swap`}
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
