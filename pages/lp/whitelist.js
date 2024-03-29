import React from 'react'
import classnames from 'classnames'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import { utils, BigNumber } from 'ethers'
import { MinusCircleIcon, ExclamationCircleIcon, CheckCircleIcon, LockClosedIcon, PencilIcon } from '@heroicons/react/solid'
import {
  CurrencyDollarIcon,
  LockOpenIcon,
  GiftIcon,
  AtSymbolIcon,
  ChatIcon,
  GlobeAltIcon,
} from '@heroicons/react/outline'

import Card, { CardTitle, CardBody } from 'components/Card'
import LoadingScreen from 'components/LoadingScreen'
import Table, { Td } from 'components/Table'
import Button from 'components/Button'
import ExternalLink from 'components/ExternalLink'
import NumberDisplay from 'components/NumberDisplay'
import Modal from 'components/Modal'
import Input from 'components/Input'

import { EXTRA_LPS } from 'lib/const'
import fetcher from 'lib/fetcher'
import { abbreviate, presets } from 'lib/swap'
import useDealer from 'lib/useDealer'

import PodAbi from './abi/Pod.json'

const cfxNetwork = presets.getNetwork('cfx')

export default function LpWhitelist() {
  const router = useRouter()

  const { data, mutate } = useSWR(`admin/whitelist`, fetcher)
  const [modalData, setModalData] = React.useState()
  const { dealer } = useDealer()

  const podContract = React.useMemo(() => {
    if (dealer) {
      const mesonClient = dealer._createMesonClient(cfxNetwork)
      const podToken = presets.getTokenByCategory('cfx', 'pod')
      return mesonClient.getContractInstance(podToken.addr, PodAbi)
    }
  }, [dealer])

  const sortedData = React.useMemo(() => {
    if (!data) {
      return
    }
    return data.sort((x, y) => {
      if (x.test !== y.test) {
        return (y.test || 0) - (x.test || 0)
      } else if (x.quota !== y.quota) {
        return y.quota - x.quota
      } else if (x.deposit !== y.deposit) {
        return y.deposit - x.deposit
      } else {
        return y.name.toLowerCase() > x.name.toLowerCase() ? -1 : 1
      }
    })
  }, [data])

  const total = React.useMemo(() => {
    if (!data) {
      return
    }
    return data.filter(d => !d.test).reduce(({ quota, deposit }, row) => ({
      quota: row.quota + quota,
      deposit: row.deposit + deposit,
    }), { quota: 0, deposit: 0 })
  }, [data])

  const [totalDeposit, setTotalDeposit] = React.useState(BigNumber.from(0))
  const [totalLocked, setTotalLocked] = React.useState(BigNumber.from(0))

  const addTo = React.useMemo(() => ({
    deposit: v => setTotalDeposit(p => p.add(v)),
    locked: v => setTotalLocked(p => p.add(v)),
  }), [])


  let body = <CardBody><LoadingScreen /></CardBody>
  if (data) {
    body = (
      <CardBody>
        <Table
          fixed
          size='lg'
          headers={[
            { name: 'Account', width: '25%' },
            { name: 'Deposit / Quota', width: '20%' },
            { name: 'Onchain Balances', width: '20%' },
            { name: 'Contact', width: '20%' },
            { name: 'Note', width: '10%' },
            { name: 'Edit', width: '5%', className: 'text-right' },
          ]}
        >
          <WhitelistedTotal
            quota={total.quota}
            deposit={total.deposit}
            totalDeposit={totalDeposit}
            totalLocked={totalLocked}
          />
          {sortedData.map((d, index) => (
            <WhitelistedAddrRow
              key={`row-${index}`}
              {...d}
              podContract={podContract}
              addTo={addTo}
              onOpenModal={() => setModalData(d)}
            />)
          )}
        </Table>
      </CardBody>
    )
  }

  return (
    <Card>
      <CardTitle
        title='LP Whitelist'
        subtitle='Addresses allowed to join liquidity providing'
        tabs={[
          { key: 'general', name: 'General', onClick: () => router.push(`/lp`) },
          ...EXTRA_LPS.map(lp => ({
            key: lp,
            name: abbreviate(lp, 4, 0),
            onClick: () => router.push(`/lp/${lp}`)
          })),
          { key: 'whitelist', name: 'Whitelist', active: true }
        ]}
        right={
          <Button size='sm' color='primary' rounded onClick={() => setModalData({})}>New</Button>
        }
      />
      {body}
      <WhitelistEntryModal
        data={modalData}
        onClose={refresh => {
          setModalData()
          refresh && mutate()
        }}
      />
    </Card>
  )
}

const fmt = Intl.NumberFormat('en', { minimumFractionDigits: 6 })

function WhitelistedTotal ({ quota, deposit, totalDeposit, totalLocked }) {
  return (
    <tr className='odd:bg-white even:bg-gray-50 hover:bg-primary-50'>
      <Td size='' className='pl-4 pr-3 sm:pl-6 py-2 font-medium'>
        Total
      </Td>
      <Td size='sm' className='font-bold'>
        <NumberDisplay className='mr-0' value={fmt.format(utils.formatUnits(deposit, 6))} length={9} />
        <div className='h-0.5 my-px w-full w-[136px] bg-black' />
        <NumberDisplay value={fmt.format(utils.formatUnits(quota, 6))} length={9} decimals={0} />
      </Td>
      <Td size='sm' className='font-bold'>
        <div className='flex items-center'>
          <CurrencyDollarIcon className='w-4 h-4 text-gray-500 mr-1' />
          <NumberDisplay
            length={7}
            value={fmt.format(utils.formatUnits(totalDeposit, 6))}
          />
        </div>
        <div className='flex items-center'>
          <LockClosedIcon className='w-4 h-4 text-gray-500 mr-1' />
          <NumberDisplay
            length={7}
            value={fmt.format(utils.formatUnits(totalLocked, 6))}
          />
        </div>
      </Td>
      <Td></Td>
      <Td></Td>
      <Td></Td>
    </tr>
  )
}

function WhitelistedAddrRow ({ _id: addr, test, name, quota = 0, deposit = 0, kyc, swapOnly, podContract, addTo, onOpenModal }) {
  const [podBalance, setPodBalance] = React.useState()
  const [lockedBalance, setLockedBalance] = React.useState()
  const [rewardsBalance, setRewardsBalance] = React.useState()

  React.useEffect(() => {
    if (!podContract) {
      return
    }

    podContract.balanceOf(addr)
      .then(v => {
        setPodBalance(v)
        !test && addTo.deposit(v)
      })

    podContract.getLockedBalance(addr)
      .then(v => {
        setLockedBalance(v)
        !test && addTo.locked(v)
      })
      .catch(err => console.warn(err))
    
    podContract.getTotalRewards(addr)
      .then(setRewardsBalance)
      .catch(err => console.warn(err))
  }, [podContract, addr, addTo, test])

  const ratio = deposit / quota
  return (
    <tr className='odd:bg-white even:bg-gray-50 hover:bg-primary-50'>
      <Td size='' className='pl-4 pr-3 sm:pl-6 py-2'>
        <div className='flex items-center'>
          {test && <MinusCircleIcon className='w-4 h-4 text-gray-500 mr-1' aria-hidden='true' />}
          {name}
        </div>
        <ExternalLink
          href={`${cfxNetwork.explorer}/address/${addr}`}
          className='flex items-center'
        >
          {abbreviate(addr, 8)}
        </ExternalLink>
      </Td>
      <Td size='sm'>
        <div className='flex items-center'>
          {!test && ratio > 0.9 && <CheckCircleIcon className='w-4 h-4 mr-px text-green-500' />}
          {!test && ratio < 0.1 && <ExclamationCircleIcon className='w-4 h-4 mr-px text-red-500' />}
          <NumberDisplay
            length={!test && (ratio > 0.9 || ratio < 0.1) ? 7 : 9}
            className='mr-0'
            value={fmt.format(utils.formatUnits(deposit, 6))}
          />
        </div>
        <div className='h-px my-0.5 w-[136px] bg-black' />
        <NumberDisplay value={fmt.format(utils.formatUnits(quota, 6))} length={9} decimals={0} />
      </Td>
      <Td size='sm'>
        <div className='flex items-center'>
          <CurrencyDollarIcon className='w-4 h-4 text-gray-500 mr-1' />
          <NumberDisplay
            length={7}
            className={podBalance?.eq(0) && 'text-gray-300'}
            value={podBalance && fmt.format(utils.formatUnits(podBalance, 6))}
          />
        </div>
        <div className={classnames(
          'relative w-full flex items-center',
          swapOnly && 'opacity-30 after:block after:absolute after:w-full after:h-0.5 after:bg-gray-600'
        )}>
          {
            lockedBalance?.gte(deposit) && lockedBalance?.gt(0)
              ? <LockClosedIcon className='w-4 h-4 text-green-500 mr-1' />
              : <LockOpenIcon className='w-4 h-4 text-gray-500 mr-1' />
          }
          <NumberDisplay
            length={7}
            className={lockedBalance?.eq(0) && 'text-gray-300'}
            value={lockedBalance && fmt.format(utils.formatUnits(lockedBalance, 6))}
          />
        </div>
        <div className={classnames(
          'relative w-full flex items-center',
          swapOnly && 'opacity-30 after:block after:absolute after:w-full after:h-0.5 after:bg-gray-600'
        )}>
          <GiftIcon className='w-4 h-4 text-gray-500 mr-1' />
          <NumberDisplay
            length={7}
            className={rewardsBalance?.eq(0) && 'text-gray-300'}
            value={rewardsBalance && fmt.format(utils.formatUnits(rewardsBalance, 6))}
          />
        </div>
      </Td>
      <Td size='sm'>
      {
        kyc?.email &&
        <div className='flex items-center'>
          <AtSymbolIcon className='w-4 h-4 text-gray-500 mr-1' aria-hidden='true' />
          {kyc?.email}
        </div>
      }
      {
        kyc?.discord &&
        <div className='flex items-center'>
          <ChatIcon className='w-4 h-4 text-gray-500 mr-1' aria-hidden='true' />
          {kyc?.discord}
        </div>
      }
      {
        kyc?.country &&
        <div className='flex items-center'>
          <GlobeAltIcon className='w-4 h-4 text-gray-500 mr-1' aria-hidden='true' />
          {kyc?.country}
        </div>
      }
      </Td>
      <Td>{kyc?.note}</Td>
      <Td className='text-right'>
        <Button rounded size='xs' color='info' onClick={onOpenModal}>
          <PencilIcon className='w-4 h-4' aria-hidden='true' />
        </Button>
      </Td>
    </tr>
  )
}

function WhitelistEntryModal ({ data, onClose }) {
  const [create, setCreate] = React.useState(false)

  const [address, setAddress] = React.useState('')
  const [name, setName] = React.useState('')
  const [quota, setQuota] = React.useState(0)

  const [email, setEmail] = React.useState('')
  const [discord, setDiscord] = React.useState('')
  const [country, setCountry] = React.useState('')
  const [note, setNote] = React.useState('')

  React.useEffect(() => {
    if (data) {
      setCreate(!Object.keys(data).length)

      setAddress(data._id || '')
      setName(data.name || '')
      setQuota(utils.formatUnits(data.quota || 0, 9))

      setEmail(data.kyc?.email || '')
      setDiscord(data.kyc?.discord || '')
      setCountry(data.kyc?.country || '')
      setNote(data.kyc?.note || '')
    }
  }, [data])

  const onSave = async () => {
    const dataToSave = {
      name,
      quota: utils.parseUnits(quota, 9).toString(),
      kyc: { email, discord, country, note }
    }

    if (create) {
      dataToSave._id = address.toLowerCase()
      await fetcher.post(`admin/whitelist`, dataToSave)
    } else {
      await fetcher.put(`admin/whitelist/${address}`, dataToSave)
    }
    onClose(true)
  }

  const onDelete = async () => {
    await fetcher.delete(`admin/whitelist/${address}`)
    onClose(true)
  }

  return (
    <Modal
      isOpen={!!data}
      title='Whitelist Entry'
      onClose={onClose}
    >
      <div className='grid gap-y-4'>
        <Input
          id='address'
          label='Address'
          value={address}
          onChange={setAddress}
          disabled={!create}
        />
        <Input
          id='name'
          label='Name'
          value={name}
          onChange={setName}
        />
        <div className='relative'>
          <Input
            id='quota'
            label='Quota'
            type='number'
            value={quota}
            onChange={setQuota}
          />
          <div className='absolute top-6 right-10 h-[38px] text-sm flex items-center'>× 1000</div>
        </div>

        <Input
          id='email'
          label='Email'
          value={email}
          onChange={setEmail}
        />
        <Input
          id='discord'
          label='Discord'
          value={discord}
          onChange={setDiscord}
        />
        <Input
          id='country'
          label='Country'
          value={country}
          onChange={setCountry}
        />
        <Input
          id='note'
          label='Extra Note'
          value={note}
          onChange={setNote}
        />
      </div>

      <div className='flex justify-between mt-6'>
        <Button rounded color='error' onClick={onDelete}>Delete</Button>
        <Button rounded color='info' onClick={onSave}>Save</Button>
      </div>
    </Modal>
  )
}
