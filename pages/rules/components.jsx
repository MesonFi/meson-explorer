import React from 'react'
import classnames from 'classnames'
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
  { id: 'ETH', name: 'ETH', icon: <TagNetworkToken iconOnly size='md' token={{ symbol: 'ETH' }} /> },
  { id: 'BTC', name: 'BTC', icon: <TagNetworkToken iconOnly size='md' token={{ symbol: 'BTC' }} /> },
  { id: 'BNB', name: 'BNB', icon: <TagNetworkToken iconOnly size='md' token={{ symbol: 'BNB' }} /> },
  { id: 'USDC', name: 'USDC', icon: <TagNetworkToken iconOnly size='md' token={{ symbol: 'USDC' }} /> },
  { id: 'USDT', name: 'USDT', icon: <TagNetworkToken iconOnly size='md' token={{ symbol: 'USDT' }} /> },
  { id: 'BUSD', name: 'BUSD', icon: <TagNetworkToken iconOnly size='md' token={{ symbol: 'BUSD' }} /> },
  { id: 'USDB', name: 'USDB', icon: <TagNetworkToken iconOnly size='md' token={{ symbol: 'USDB' }} /> },
  { id: 'FDUSD', name: 'FDUSD', icon: <TagNetworkToken iconOnly size='md' token={{ symbol: 'FDUSD' }} /> },
  { id: 'DAI', name: 'DAI', icon: <TagNetworkToken iconOnly size='md' token={{ symbol: 'DAI' }} /> },
  { id: 'cUSD', name: 'cUSD', icon: <TagNetworkToken iconOnly size='md' token={{ symbol: 'cUSD' }} /> },
  { id: 'PoD', name: 'PoD', icon: <TagNetworkToken iconOnly size='md' token={{ symbol: 'PoD' }} /> },
]

export function SwapRuleModal ({ hides, type, data, onClose }) {
  const [create, setCreate] = React.useState(false)

  const [fromChain, setFromChain] = React.useState('*')
  const [fromToken, setFromToken] = React.useState('*')
  const [toChain, setToChain] = React.useState('*')
  const [toToken, setToToken] = React.useState('*')

  const [priority, setPriority] = React.useState(0)
  const [limit, setLimit] = React.useState('')
  const [factor, setFactor] = React.useState('')
  const [minimum, setMinimum] = React.useState('')
  const [initiators, setInitiators] = React.useState('')
  const [mark, setMark] = React.useState('')
  const [fee, setFee] = React.useState('')

  React.useEffect(() => {
    if (data) {
      setCreate(data.create || !Object.keys(data).length)

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
      setMinimum(typeof data.minimum === 'number' ? ethers.utils.formatUnits(data.minimum, 6) : '')
      setInitiators(data.initiators?.map(i => i.note ? `${i.note}:${i.addr}` : i.addr).join('\n') || '')
      setMark(data.mark || '')
      setFee(JSON.stringify(data.fee, null, 2) || '[\n]')
    }
  }, [data])

  const onSave = async () => {
    const dataToSave = {
      type,
      from: fromToken === '*' ? fromChain : `${fromChain}:${fromToken}`,
      to: toToken === 'x' ? 'x' : toToken === '*' ? toChain : `${toChain}:${toToken}`,
      priority,
      limit,
      factor,
      minimum: minimum && ethers.utils.parseUnits(minimum, 6).toNumber(),
      initiators: type === 'address' ? initiators.split('\n').filter(Boolean).map(line => {
        const [p1, p2] = line.split(':')
        return p2 ? { note: p1.trim(), addr: p2.trim() } : { addr: p1.trim() }
      }) : undefined,
      mark,
      fee: JSON.parse(fee)
    }

    if (create) {
      await fetcher.post(`admin/rules`, dataToSave)
    } else {
      const id = data._id || `${dataToSave.from}>${dataToSave.to}`
      await fetcher.put(`admin/rules/${id}`, dataToSave)
    }
    onClose(true)
  }

  const onDelete = async () => {
    const id = data._id || `${data.from}>${data.to}`
    await fetcher.delete(`admin/rules/${id}`, { priority })
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
              disabled={type === 'network' || type === 'gas'}
            />
            <Select
              className='w-5/12'
              noIcon
              noBorder
              options={tokens}
              value={fromToken}
              onChange={setFromToken}
              disabled={type === 'network' || type === 'gas'}
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
              disabled={type === 'network' || type === 'gas'}
            />
            <Select
              className='w-5/12'
              noIcon
              noBorder
              options={tokens}
              value={toToken}
              onChange={setToToken}
              disabled={type === 'network' || type === 'gas'}
            />
          </div>
        </div>

        {
          !hides.includes('priority') &&
          <Input
            className='col-span-3'
            id='priority'
            label='Priority'
            type='number'
            value={priority}
            onChange={setPriority}
            disabled={type === 'network' || type === 'gas'}
          />
        }
        {
          !hides.includes('limit') &&
          <Input
            className='col-span-3'
            id='limit'
            label='Limit'
            type='number'
            value={limit}
            onChange={setLimit}
          />
        }
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
          !hides.includes('minimum') &&
          <Input
            className='col-span-3'
            id='minimum'
            label='Minimum'
            type='number'
            value={minimum}
            onChange={setMinimum}
          />
        }
        {
          !hides.includes('initiators') &&
          <Input
            className='col-span-6'
            id='initiators'
            label='Initiators'
            type='textarea'
            value={initiators}
            onChange={setInitiators}
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
        {
          hides.includes('initiators') && !hides.includes('marks') &&
          <Input
            className='col-span-6'
            id='mark'
            label='Mark'
            value={mark}
            onChange={setMark}
          />
        }
      </div>

      <div className='flex justify-between mt-6'>
        <Button rounded color='error' onClick={onDelete}>Delete</Button>
        <Button rounded color='info' onClick={onSave}>Save</Button>
      </div>
    </Modal>
  )
}

const fmt = Intl.NumberFormat()
const fmt2 = Intl.NumberFormat('en', { maximumSignificantDigits: 4 })

export function RowSwapRule ({ d, prices, onOpenModal, hides = [] }) {
  const isETH = d.to.endsWith('ETH')
  const isBTC = d.to.endsWith('BTC')
  const isBNB = d.to.endsWith('BNB')
  const nonStablecoin = isETH || isBTC || isBNB
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
      <Td size='sm'>{d.limit && (nonStablecoin ? d.limit : `${fmt.format(d.limit / 1000)}k`)}</Td>
      {!hides.includes('factor') && <Td size='sm'>{d.factor}</Td>}
      {!hides.includes('minimum') && <Td size='sm'>{d.minimum && `${nonStablecoin ? '' : '$'}${ethers.utils.formatUnits(d.minimum, 6)}`}</Td>}
      {
        !hides.includes('rules') &&
        <>
          <Td size='sm'>{d.fee?.map((item, i) => <FeeRule key={i} {...item} nonStablecoin={nonStablecoin} />)}</Td>
          <Td size='sm'></Td>
        </>
      }
      {
        !hides.includes('gas') &&
        <Td size='sm'>
          {d.fee?.map((item, i) => <GasCalculation key={i} {...item} nonStablecoin={nonStablecoin} prices={prices} gasPrice={d.gasPrice} gasPriceL0={d.gasPriceL0} />)}
        </Td>
      }
      {
        !hides.includes('initiators') &&
        <Td size='sm' wrap>
        {
          d.initiators?.map((line, i) => (
            <div key={`initiator-${i}`} className='flex flex-row items-center text-xs'>
              <div className='w-20 mr-2 font-medium text-gray-500 overflow-hidden flex-shrink-0'>{line.note}</div>
              <div className='font-mono break-all'>{line.addr}</div>
            </div>
          ))
        }
        </Td>
      }
      {!hides.includes('premium') && <Td size='sm'>{d.premium ? '✅' : ''}</Td>}
      {hides.includes('initiators') && <Td size='sm'>{d.mark}</Td>}
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

function FeeRule ({ min, base, gasFee, rate, nonStablecoin }) {
  let minStr = min
  if (min > 1000) {
    minStr = (min / 1000) + 'k'
  }

  const range = <span className='inline-block w-12'>{min && `≥${minStr}`}</span>

  const rule = []
  if (base) {
    rule.push(`${nonStablecoin ? '' : '$'}${ethers.utils.formatUnits(base, 6)}`)
  }
  if (gasFee) {
    if (nonStablecoin) {
      rule.push(
        <div className='flex items-center -mr-3'>
          {ethers.utils.formatUnits(gasFee, 3)}
          <span className='ml-0.5 text-[10px] text-gray-500'>× 10<sup>-3</sup> 🔹</span>
        </div>
      )
    } else {
      rule.push(`$${ethers.utils.formatUnits(gasFee, 6)}`)
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
      <div>{rule.length > 1 ? rule.join(' + ') : rule[0]}</div>
    </div>
  )
}

const CoreSymbols = {
  BTC: '🫓',
  ETH: '🔹',
  BNB: '🔸',
  TRX: '🔻',
}

export function GasCalculation ({ gas, core, token, multiplier = 1, noIcon, nonStablecoin, prices, gasPrice, gasL0, gasPriceL0 }) {
  if (!(gas && gasPrice)) {
    return ''
  }

  const price = prices[core?.toLowerCase?.()]
  const tokenPrice = prices[token?.toLowerCase?.()] || 1
  const corePrice = price || core || 1
  let coreDisplay = null
  if (!price) {
    if (core) {
      coreDisplay = `$${core}`
    }
  } else if (tokenPrice !== 1) {
    coreDisplay = (
      <div className='h-4 leading-4 text-xs'>
        {CoreSymbols[core] || core}/ {CoreSymbols[token]} <span className='text-gray-500'>(${tokenPrice})</span>
      </div>
    )
  } else {
    coreDisplay = (
      <div className='h-4 leading-4'>
        {CoreSymbols[core] || core} <span className='text-xs text-gray-500'>(${price})</span>
      </div>
    )
  }

  let gasUsed = gas * gasPrice
  if (gasL0 && gasPriceL0) {
    gasUsed += gasL0 * gasPriceL0
  }

  const feeValue = corePrice * gasUsed * (multiplier || 1) / (nonStablecoin ? 1e15 : 1e18) / tokenPrice
  const gasFee = nonStablecoin
    ? <div className='flex items-center'>
        {fmt.format(feeValue)}
        <span className='ml-0.5 text-[10px] opacity-50'>× 10<sup>-3</sup>{noIcon ? '' : ' 🔹'}</span>
      </div>
    : <div className='ml-1'>${fmt.format(feeValue)}</div>

  return (
    <div className='flex-1'>
      <div className='flex flex-row items-center gap-2'>
        <div className='flex-[1.5] shrink-0'>
          <div
            className={classnames(
              '-ml-2',
              feeValue >= 10 && 'bg-red-500 !text-white group-hover:opacity-50',
              feeValue >= 2 && feeValue < 10 && 'bg-warning !text-white group-hover:opacity-50',
              feeValue >= 0.5 && feeValue < 2 && 'bg-indigo-300 !text-white group-hover:opacity-50',
              feeValue >= 0.1 && feeValue < 0.5 && 'text-indigo-500',
            )}
          >
            {gasFee}
          </div>
        </div>
        <div className='text-xs text-gray-500 leading-4'>=</div>
        <div className='flex-[1.2] shrink-0 flex flex-row items-center'>
          {gasL0 && gasPriceL0 && <div className='text-2xl font-extralight text-gray-300 mr-1'>(</div>}
          <div>
            <div>{fmt.format(gas / 1000)}k</div>
            {gasL0 && gasPriceL0 && <div>{fmt.format(gasL0 / 1000)}k</div>}
          </div>
        </div>
        <div className='flex flex-col text-xs text-gray-500 items-center leading-4'>
          <div className='leading-4'>×</div>
          {gasL0 && gasPriceL0 && <div className='leading-4'>×</div>}
        </div>
        <div className='flex-[2.5] shrink-0 flex flex-row items-center'>
          <div>
            <div>{fmt2.format(gasPrice / 1e9)} Gwei</div>
            {gasL0 && gasPriceL0 && <div>{fmt2.format(gasPriceL0 / 1e9)} Gwei</div>}
          </div>
          {gasL0 && gasPriceL0 && <div className='text-2xl font-extralight text-gray-300 ml-2'>)</div>}
        </div>
        <div className={classnames('text-xs leading-4', corePrice !== 1 ? 'text-gray-500' : 'text-transparent')}>×</div>
        <div className='flex-[2] shrink-0 overflow-hidden'>{coreDisplay}</div>
        <div className={classnames('text-xs leading-4', multiplier === 1 ? 'text-transparent' : 'text-gray-500')}>×</div>
        <div className='flex-1 shrink-0'>{multiplier !== 1 && multiplier}</div>
      </div>
    </div>
  )
}
