import React from 'react'
import useSWR from 'swr'

import fetcher from 'lib/fetcher'

import Card, { CardTitle, CardBody } from 'components/Card'
import LoadingScreen from 'components/LoadingScreen'
import Table, { Td } from 'components/Table'

export default function StatsPremium() {
  const { data, error } = useSWR(`stats/premium`, fetcher)

  let body
  if (error) {
    body = <div className='py-6 px-4 sm:px-6 text-red-400'>{error.message}</div>
  } else if (!data) {
    body = <LoadingScreen />
  } else {
    const total = data.reduce(({ buy, renew }, row) => ({
      buy: row.buy + buy,
      renew: row.renew + renew
    }), { buy: 0, renew: 0 })
    body = (
      <Table size='lg' headers={[
        { name: 'date', width: '40%' },
        { name: 'buy', width: '30%' },
        { name: 'renew', width: '30%' }
      ]}>
        <StatPremiumRow _id='Total' {...total} />
        {data.map((row, index) => <StatPremiumRow key={`stat-table-row-${index}`} {...row} />)}
      </Table>
    )
  }

  return (
    <Card>
      <CardTitle title='Stats for Premium' />
      <CardBody>
        {body}
      </CardBody>
    </Card>
  )
}

function StatPremiumRow ({ _id: date, buy, renew }) {
  return (
    <tr className='odd:bg-white even:bg-gray-50'>
      <Td size='lg'>{date}</Td>
      <Td>{buy}</Td>
      <Td>{renew}</Td>
    </tr>
  )
}