import React from 'react'
import { useRouter } from 'next/router'

import { usePagination } from 'lib/fetcher'

import LoadingScreen from 'components/LoadingScreen'

import Pagination from './Pagination'

export default function PagiList({ queryUrl, fallback, redirectFallback = () => false, reducer, pageSize = 10, maxPage, children }) {
  const router = useRouter()
  const { data, total, error, page } = usePagination(queryUrl, router.query.page, pageSize, { fetchTotal: !maxPage })

  if (Number.isNaN(page) || redirectFallback(error, page)) {
    router.replace(fallback)
  }

  if (error) {
    return <div className='py-6 px-4 sm:px-6 text-red-400'>{error.message}</div>
  } else if (!data) {
    return <LoadingScreen />
  } else {
    const { maxPage: mp } = data
    const list = [...data.list]
    if (reducer && list.length) {
      list.unshift(list.reduce(reducer, null))
    }
    if (total && page * pageSize > total) {
      router.replace('/')
    }
    const onPageChange = page => router.push({ query: { ...router.query, page: page + 1 } })

    return (
      <>
        {React.cloneElement(children, { list })}
        <Pagination size={pageSize} page={page} currentSize={list.length} total={total} maxPage={mp || maxPage} onPageChange={onPageChange} />
      </>
    )
  }
}
