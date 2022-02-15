import React from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'

import SwapRow from '../components/SwapRow'
import Pagination from '../components/Pagination'

const fetcher = async pageStr => {
  const page = Number(pageStr || 1) - 1
  if (Number.isNaN(page) || !Number.isInteger(page) || page < 0) {
    throw new Error()
  }
  const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/v1/swap?page=${page}`)
  const json = await res.json()
  if (json.result) {
    const { total, list } = json.result
    if (page * 10 > total) {
      throw new Error()
    }
    return { page, total, list }
  } else {
    throw new Error(json.error.message)
  }
}

export default function SwapList() {
  const router = useRouter()
  const { data, error } = useSWR(router.query.page || '1', fetcher)
  React.useEffect(() => {
    if (error) {
      router.replace('/')
    }
  }, [error])

  if (error) {
    return null
  } else if (!data) {
    return (
      <div className='flex items-center justify-center mt-6'>
        <svg className='w-5 h-5 text-gray-500 animate-spin' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
          <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
          <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
        </svg>
      </div>
    )
  }

  const { page, total, list } = data
  const onPageChange = page => {
    router.push(`/?page=${page+1}`)
  }
  return (
    <div className='overflow-hidden border-b border-gray-200 rounded-lg shadow'>
      <table className='min-w-full divide-y divide-gray-200'>
        <thead className='bg-gray-50'>
          <tr>
            <th scope='col' className='p-3 pl-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase sm:pl-6'>swap id / time</th>
            <th scope='col' className='p-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase'>status</th>
            <th scope='col' className='p-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase'>from</th>
            <th scope='col' className='p-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase'>to</th>
            <th scope='col' className='p-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase'>amount</th>
            <th scope='col' className='p-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase'>duration</th>
          </tr>
        </thead>
        <tbody className='bg-white divide-y divide-gray-200'>
          {list.map(swap => <SwapRow key={swap._id} swap={swap} />)}
        </tbody>
      </table>
      <Pagination size={10} page={page} total={total} onPageChange={onPageChange} />
    </div>
  )
}
