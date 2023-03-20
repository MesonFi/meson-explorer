import React from 'react'
import { PencilIcon } from '@heroicons/react/solid'

import { ethers } from 'ethers'

import Modal from 'components/Modal'
import Input from 'components/Input'
import Select from 'components/Select'
import { Td } from 'components/Table'
import Button from 'components/Button'
import TagNetwork from 'components/TagNetwork'
import TagNetworkToken from 'components/TagNetworkToken'

import fetcher from 'lib/fetcher'
import { getAllNetworks } from 'lib/swap'

const chains = [
  { id: '*', name: 'Any Chain' },
  ...getAllNetworks().map(n => ({ id: n.id, name: n.name, icon: <TagNetwork iconOnly size='md' network={n} /> }))
]
const tokens = [
  { id: '*', name: 'Any Token' },
  { id: 'x', name: 'Different' },
  { id: 'USDC', name: 'USDC', icon: <TagNetworkToken iconOnly size='md' token={{ symbol: 'USDC' }} /> },
  { id: 'USDT', name: 'USDT', icon: <TagNetworkToken iconOnly size='md' token={{ symbol: 'USDT' }} /> },
  { id: 'BUSD', name: 'BUSD', icon: <TagNetworkToken iconOnly size='md' token={{ symbol: 'BUSD' }} /> },
  { id: 'PoD', name: 'PoD', icon: <TagNetworkToken iconOnly size='md' token={{ symbol: 'PoD' }} /> },
  { id: 'UCT', name: 'UCT', icon: <TagNetworkToken iconOnly size='md' token={{ symbol: 'UCT' }} /> }
]

export function SwapRuleModal ({ hides, type, data, onClose }) {
  const [fromChain, setFromChain] = React.useState('*')
  const [fromToken, setFromToken] = React.useState('*')
  const [toChain, setToChain] = React.useState('*')
  const [toToken, setToToken] = React.useState('*')

  const [priority, setPriority] = React.useState(0)
  const [limit, setLimit] = React.useState('')
  const [factor, setFactor] = React.useState('')
  const [initiator, setInitiator] = React.useState('')
  const [mark, setMark] = React.useState('')
  const [fee, setFee] = React.useState('')

  React.useEffect(() => {
    if (data) {
      const [fromChain, fromToken = '*'] = (data.from || '').split(':')
      setFromChain(fromChain || '*')
      setFromToken(fromToken)
      let [toChain, toToken = '*'] = (data.to || '').split(':')
      if (data.to === 'x') {
        toChain = '*'
        toToken = 'x'
      }
      setToChain(toChain || '*')
      setToToken(toToken)
      setPriority(data.priority || 0)
      setLimit(typeof data.limit === 'number' ? data.limit : '')
      setFactor(typeof data.factor === 'number' ? data.factor : '')
      setInitiator(data.initiator || '')
      setMark(data.mark || '')
      setFee(JSON.stringify(data.fee, null, 2) || '[\n]')
    }
  }, [data])

  const onSave = async () => {
    const newData = {
      type,
      from: fromToken === '*' ? fromChain : `${fromChain}:${fromToken}`,
      to: toToken === 'x' ? 'x' : toToken === '*' ? toChain : `${toChain}:${toToken}`,
      priority,
      limit,
      factor,
      initiator,
      mark,
      fee: JSON.parse(fee)
    }

    if (data._id) {
      await fetcher.put(`admin/rules/${data._id}`, newData)
    } else {
      await fetcher.post(`admin/rules`, newData)
    }
    onClose(true)
  }

  const onDelete = async () => {
    await fetcher.delete(`admin/rules/${data._id}`)
    onClose(true)
  }

  return (
    <Modal
      isOpen={!!data}
      title='Swap Rule'
      onClose={onClose}
    >
      <div className='grid grid-cols-6 gap-x-6 gap-y-4'>
        <div className='col-span-3'>
          <label className='block text-sm font-medium text-gray-700'>From</label>
          <div className='mt-1 flex border border-gray-300 shadow-sm rounded-md'>
            <Select
              className='w-7/12 border-r border-gray-300'
              noIcon
              noBorder
              options={chains}
              value={fromChain}
              onChange={setFromChain}
            />
            <Select
              className='w-5/12'
              noIcon
              noBorder
              options={tokens}
              value={fromToken}
              onChange={setFromToken}
            />
          </div>
        </div>

        <div className='col-span-3'>
          <label className='block text-sm font-medium text-gray-700'>To</label>
          <div className='mt-1 flex border border-gray-300 shadow-sm rounded-md'>
            <Select
              className='w-7/12 border-r border-gray-300'
              noIcon
              noBorder
              options={chains}
              value={toChain}
              onChange={setToChain}
            />
            <Select
              className='w-5/12'
              noIcon
              noBorder
              options={tokens}
              value={toToken}
              onChange={setToToken}
            />
          </div>
        </div>

        <Input
          className='col-span-6'
          id='priority'
          label='Priority'
          type='number'
          value={priority}
          onChange={setPriority}
        />
        <Input
          className='col-span-3'
          id='limit'
          label='Limit'
          type='number'
          value={limit}
          onChange={setLimit}
        />
        {
          !hides.includes('factor') &&
          <Input
            className='col-span-3'
            id='factor'
            label='Factor'
            type='number'
            value={factor}
            onChange={setFactor}
          />
        }
        {
          !hides.includes('initiator') &&
          <Input
            className='col-span-6'
            id='initiator'
            label='Initiator'
            value={initiator}
            onChange={setInitiator}
          />
        }
        {
          !hides.includes('rules') &&
          <Input
            className='col-span-6'
            id='rules'
            label='Fee Rules'
            type='textarea'
            value={fee}
            onChange={setFee}
          />
        }
        <Input
          className='col-span-6'
          id='mark'
          label='Mark'
          value={mark}
          onChange={setMark}
        />
      </div>

      <div className='flex justify-between mt-6'>
        <Button rounded color='error' onClick={onDelete}>Delete</Button>
        <Button rounded color='info' onClick={onSave}>Save</Button>
      </div>
    </Modal>
  )
}

const fmt = Intl.NumberFormat()
const gasPrice = {
  eth: 12e9,
  bnb: 5e9,
  polygon: 112e9,
  arb: 0.1e9,
  opt: 0.001e9,
  avax: 25e9,
  ftm: 50e9,
  aurora: 0.07e9,
  cfx: 20e9,
  movr: 1e9,
  cronos: 4800e9,
  beam: 100e9,
}

export function RowSwapRule ({ d, onOpenModal, hides = [] }) {
  return (
    <tr className='odd:bg-white even:bg-gray-50 hover:bg-primary-50'>
      <Td size='' className='pl-4 pr-3 sm:pl-6 py-1'>
        <div className='flex flex-row items-center text-sm h-5'>
          <SwapRuleRouteKey routeKey={d.from} />
          <div className='text-gray-500 mx-1 text-xs'>{'->'}</div>
          <SwapRuleRouteKey routeKey={d.to} />
        </div>
        <div className='text-xs text-gray-500'>
          #{d.priority}
        </div>
      </Td>
      <Td size='sm'>{d.limit && fmt.format(d.limit)}</Td>
      {!hides.includes('factor') && <Td size='sm'>{d.factor}</Td>}
      {
        !hides.includes('rules') &&
        <>
          <Td size='sm'>{d.fee?.map((item, i) => <FeeRule key={i} {...item} gasPrice={gasPrice[d.to]} />)}</Td>
          <Td></Td>
        </>
      }
      {!hides.includes('initiator') && <Td size='sm' wrap><span className='break-all'>{d.initiator}</span></Td>}
      {!hides.includes('premium') && <Td size='sm'>{d.premium ? '✅' : ''}</Td>}
      <Td size='sm'>{d.mark}</Td>
      <Td size='sm' className='text-right'>
        <Button rounded size='xs' color='info' onClick={() => onOpenModal(d)}>
          <PencilIcon className='w-4 h-4' aria-hidden='true' />
        </Button>
      </Td>
    </tr>
  )
}

function SwapRuleRouteKey ({ routeKey = '' }) {
  if (routeKey === '*') {
    return 'any'
  }
  if (routeKey === 'x') {
    return 'different token'
  }
  const [n, t = '*'] = routeKey.split(':')
  if (n === '*') {
    if (t === '*') {
      return 'any'
    } else {
      return <TagNetworkToken iconOnly token={{ symbol: t }} />
    }
  }
  return (
    <div className='flex flex-row'>
      <TagNetwork iconOnly network={{ id: n }} />
      { t !== '*' && <TagNetworkToken iconOnly token={{ symbol: t }} className='ml-1' /> }
    </div>
  )
}

function FeeRule ({ min, base, rate, gas, core, gasPrice }) {
  let minStr = min
  if (min > 1000) {
    minStr = (min / 1000) + 'k'
  }

  const range = <span className='inline-block w-12'>{min && `≥${minStr}`}</span>

  const rule = []
  if (base) {
    rule.push(`$${ethers.utils.formatUnits(base, 6)}`)
    if (gas && core) {
      rule[0] += ` ($${core} * ${fmt.format(gas/1000)}k * ⛽️ ≈ $${fmt.format(core * gas * gasPrice / 1e18)})`
    }
  }
  if (rate) {
    rule.push(`${rate/10000}%`)
  }
  if (!rule.length) {
    rule.push('0')
  }
  return (
    <div className='flex justify-between'>
      <div>{range}</div>
      <div>{rule.join(' + ')}</div>
    </div>
  )
}