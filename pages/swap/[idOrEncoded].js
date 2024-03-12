import React from 'react'
import classnames from 'classnames'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import useSWR from 'swr'
import { ethers } from 'ethers'

import { XCircleIcon } from '@heroicons/react/solid'
import { DocumentTextIcon } from '@heroicons/react/outline'

import fetcher from 'lib/fetcher'
import socket from 'lib/socket'
import {
  presets,
  abbreviate,
  sortEvents,
  FailedStatus,
  CancelledStatus,
  getStatusFromEvents,
  getDuration,
  getExplorerAddressLink,
  getExplorerTxLink
} from 'lib/swap'
import extensions from 'lib/extensions'
import useDealer from 'lib/useDealer'

import LoadingScreen from 'components/LoadingScreen'
import Card, { CardTitle, CardBody } from 'components/Card'
import Button from 'components/Button'
import Badge from 'components/Badge'
import SwapStatusBadge from 'components/SwapStatusBadge'
import ListRow from 'components/ListRow'
import ExternalLink from 'components/ExternalLink'
import TagNetwork from 'components/TagNetwork'
import TagNetworkToken from 'components/TagNetworkToken'
import { Loading } from 'components/LoadingScreen'


const StatusDesc = {
  PENDING: `A swap initiated but not processed yet`,
  RELEASING: `Releasing fund to recipient...`,
  DROPPED: `Swap not processed by Meson. Fund still in user's address.`,
  EXPIRED: `Swap didn't finish within valid time. Need to withdraw fund.`,
  CANCELLED: `Swap didn't finish within valid time. Fund was returned to sender's address.`,
  UNLOCKED: `Swap didn't finish within valid time. Fund can be withdrawn after expire time.`
}

const fmt = Intl.NumberFormat('en')

export default function SwapDetail() {
  const router = useRouter()
  const idOrEncoded = router.query.idOrEncoded
  const { data, error } = useSWR(`swap/${idOrEncoded}`, fetcher)

  if (error) {
    try {
      const { swap, from, to } = presets.parseInOutNetworkTokens(idOrEncoded)
      return (
        <Card>
          <CardTitle
            title='Swap'
            badge={<SwapStatusBadge status='TEMPORARY' />}
            subtitle='An encoded swap'
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
          title='Swap'
          badge={<SwapStatusBadge error />}
          subtitle={error.message}
        />
        <CardBody border={false}>
          <dl>
            <ListRow title='Query'>
              <div className='break-all'>{idOrEncoded}</div>
            </ListRow>
          </dl>
        </CardBody>
      </Card>
    )
  }

  return <CorrectSwap data={data} />
}

function CorrectSwap({ data: raw }) {
  const { data: session } = useSession()
  const roles = session?.user?.roles || []
  const isRoot = roles.some(r => r === 'root')
  const authorized = roles.some(r => ['root', 'admin'].includes(r))
  const [isLp, poolIndex = ''] = roles.find(r => r.startsWith('lp:'))?.split(':') || []
  const role = isRoot ? 'root' : authorized ? 'admin' : ''

  const [data, setData] = React.useState(raw)
  React.useEffect(() => { setData(raw) }, [raw])

  const swapUpdateListener = ({ status, data } = {}) => {
    setData(prev => {
      const updates = {}
      if (!data.hash || !prev.events.find(e => e.hash === data.hash)) {
        updates.events = [...prev.events, { name: status, ...data }]
      }
      if (!data.failed) {
        if (status === 'POSTED') {
          updates.posted = data.ts * 1000
        } else if (status === 'BONDED') {
          updates.bonded = data.ts * 1000
        } else if (status === 'RELEASED') {
          updates.released = data.ts * 1000
        } else if (status === 'EXECUTED') {
          updates.executed = data.ts * 1000
        } else if (!prev.fromTo[1] && data.recipient) {
          updates.fromTo = [prev.fromTo[0], data.recipient]
        }
      }
      if (Object.keys(updates).length) {
        return { ...prev, ...updates }
      }
      return prev
    })
  }

  const noSubscribe = !data || (data.released && data.executed)
  React.useEffect(() => {
    if (noSubscribe) {
      return
    }
    return socket.subscribe(data._id, swapUpdateListener)
  }, [data?._id, noSubscribe])


  let body
  const { swap, from, to } = React.useMemo(() => presets.parseInOutNetworkTokens(data?.encoded), [data?.encoded])

  const status = getStatusFromEvents(data?.events, swap?.expireTs, data?.tempAt)

  if (!data) {
    body = <LoadingScreen />
  } else if (!from || !to) {
    body = ''
  } else {
    const fromAddress = data.fromTo[0] || data.initiator
    const recipient = data.fromTo[1] || ''
    const { srFee = 0, lpFee = 0 } = data

    body = (
      <dl>
        {isRoot && <OnChainStatus data={data} from={from} to={to} />}
        <ListRow title='Swap ID'>
          <div className='break-all'>{data._id}</div>
        </ListRow>
        <ListRow title='Encoded As'>
          {authorized ? <EncodedSplitted swap={swap} /> : <div className='break-all'>{data.encoded}</div>}
          {!swap.version && <div className='text-sm text-gray-500'>v0 encoding</div>}
          {authorized && <SwapSaltBadges swap={swap} />}
        </ListRow>
        <ListRow title='From'>
          <TagNetwork network={from.network} address={fromAddress} />
          <div className='flex items-center text-normal'>
            {
              data.fromContract && 
              <DocumentTextIcon className='w-4 shrink-0 text-gray-500 mr-0.5' aria-hidden='true' />
            }
            <span className='truncate hover:underline hover:text-primary'>
              <Link href={`/address/${fromAddress}`}>{fromAddress}</Link>
            </span>
          </div>
        </ListRow>
        <ListRow title='To'>
          <TagNetwork network={to.network} address={recipient} />
          <div className='flex items-center text-normal'>
            {
              ['6', '2'].includes(swap.salt[2]) && 
              <DocumentTextIcon className='w-4 shrink-0 text-gray-500 mr-0.5' aria-hidden='true' />
            }
            <span className='truncate hover:underline hover:text-primary'>
              <Link href={`/address/${recipient}`}>{recipient}</Link>
            </span>
          </div>
        </ListRow>
        <SwapAmountAndFeeDisplay
          status={status}
          from={from}
          to={to}
          swap={swap}
          srFee={srFee}
          lpFee={lpFee}
          hideSharingFee={!authorized && !isLp}
        />
        {
          data.tempAt
          ? <ListRow title='Temporarily created'>
              {new Date(data.tempAt).toLocaleString()}
            </ListRow>
          : <ListRow title='Requested at'>
              {new Date(data.created).toLocaleString()}
            </ListRow>
        }
        <SwapTimes data={data} swap={swap} />
        {
          !!data.events.length &&
          <ListRow title='Process'>
            <ul role='list' className='border border-gray-200 rounded-md divide-y divide-gray-200 bg-white'>
              {sortEvents(data.events).map((e, index) => (
                <li key={`process-${index}`}>
                  <div className='lg:grid lg:grid-cols-4 sm:px-4 sm:py-3 px-3 py-2 text-sm'>
                    <div><SwapStepName {...e} /></div>
                    <div className='lg:col-span-3 lg:flex lg:flex-row lg:justify-end'>
                      <div className='max-w-full truncate text-gray-500'>
                        <SwapStepInfo {...e} fromAddress={fromAddress} from={from} to={to} />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </ListRow>
        }
      </dl>
    )
  }

  return (
    <Card>
      <CardTitle
        title='Swap'
        badge={(
          <div className='flex flex-row items-center'>
            <SwapStatusBadge status={status} />
            {authorized && data?.hide && <Badge className='ml-2'>HIDE</Badge>}
            {isRoot && data?.modified && <Badge type='warning' className='ml-2'>MODIFIED</Badge>}
            {isRoot && data?.errorConfirmed && <Badge type='warning' className='ml-2'>ERROR CONFIRMED</Badge>}
          </div>
        )}
        subtitle={StatusDesc[status?.replace('*', '')]}
        right={<SwapActionButton role={role} data={data} swap={swap} status={status} />}
      />
      <CardBody border={!data}>
        {body}
      </CardBody>
    </Card>
  )
}

export function EncodedSplitted({ swap }) {
  const encoded = swap.encoded
  const splitPos = swap._splitPos + 12
  return (
    <div>
      <span className='whitespace-nowrap'>
        <span className='text-gray-500'>{encoded.substring(0, 4)}</span>
        <span className='group inline-block relative ml-1 cursor-pointer hover:underline'>
          {encoded.substring(4, 14)}
          <span className='hidden group-hover:block absolute bottom-6 bg-white border rounded-lg px-2 py-1'>
            {parseInt('0x' + encoded.substring(4, 14)) / 1e6}
          </span>
        </span>
        <span className='ml-1 text-gray-500 cursor-pointer hover:underline'>
          {encoded.substring(14, 18)}
        </span>
        <span className='ml-1'>
          <span className='group inline-block relative cursor-pointer hover:underline'>
            {encoded.substring(18, splitPos)}
            <span className='hidden group-hover:block absolute bottom-6 bg-white border rounded-lg px-2 py-1'>
            {
              swap._newFormat && swap.swapForCoreToken
              ? <div><div className='text-sm text-gray-500'>Core token price</div><div>${fmt.format(swap.coreTokenPrice)}</div></div>
              : parseInt('0x' + encoded.substring(18, splitPos))
            }
            </span>
          </span>
          <span className='group inline-block relative cursor-pointer hover:underline'>
            {encoded.substring(splitPos, 26)}
            <span className='hidden group-hover:block absolute bottom-6 bg-white border rounded-lg px-2 py-1'>
            {
              swap._newFormat && swap.swapForCoreToken
              ? <div><div className='text-sm text-gray-500'>Swap for core amount</div><div>{fmt.format(ethers.utils.formatUnits(swap.amountForCoreToken, 6))}</div></div>
              : parseInt('0x' + encoded.substring(splitPos, 26))
            }
            </span>
          </span>
          <span className='text-gray-500'>{encoded.substring(26, 34)}</span>
        </span>
        <span className='group inline-block relative ml-1 cursor-pointer hover:underline'>
          {encoded.substring(34, 44)}
          <span className='hidden group-hover:block absolute bottom-6 bg-white border rounded-lg px-2 py-1'>
            {parseInt('0x' + encoded.substring(34, 44)) / 1e6}
          </span>
        </span>
        <span className='group inline-block relative ml-1 text-gray-500 cursor-pointer hover:underline'>
          {encoded.substring(44, 54)}
          <span className='hidden group-hover:block absolute bottom-6 left-0 whitespace-nowrap bg-white border rounded-lg px-2 py-1 text-black text-sm'>
            {new Date(parseInt('0x' + encoded.substring(44, 54)) * 1000).toLocaleString()}
          </span>
        </span>
        <span className='ml-1'>{encoded.substring(54, 58)}</span>
        <span className='ml-1'>{encoded.substring(58, 60)}</span>
        <span className='ml-1 text-gray-500'>{encoded.substring(60, 64)}</span>
        <span className='ml-1 text-gray-500'>{encoded.substring(64)}</span>
      </span>
      <div className='-mt-0.5 flex h-5 text-gray-500 whitespace-nowrap overflow-hidden'>
        <div className='relative'>
          <div className='opacity-0'>{encoded.substring(0, 4)}</div>
          <div className='absolute inset-0 mx-auto w-fit text-[8px] uppercase'>version</div>
        </div>
        <div className='ml-1 relative'>
          <div className='opacity-0'>{encoded.substring(4, 14)}</div>
          <div className='absolute inset-0 mx-auto w-fit text-[8px] uppercase'>amount</div>
        </div>
        <div className='ml-1 relative'>
          <div className='opacity-0'>{encoded.substring(14, 18)}</div>
          <div className='absolute inset-0 mx-auto w-fit text-[8px] uppercase'>header</div>
        </div>
        <div className='ml-1 relative'>
          <div className='opacity-0'>{encoded.substring(18, 34)}</div>
          <div className='absolute inset-0 mx-auto w-fit text-[8px] uppercase'>salt data</div>
        </div>
        <div className='ml-1 relative'>
          <div className='opacity-0'>{encoded.substring(34, 44)}</div>
          <div className='absolute inset-0 mx-auto w-fit text-[8px] uppercase'>lp fee</div>
        </div>
        <div className='ml-1 relative'>
          <div className='opacity-0'>{encoded.substring(44, 54)}</div>
          <div className='absolute inset-0 mx-auto w-fit text-[8px] uppercase'>expire ts</div>
        </div>
        <div className='ml-1 relative'>
          <div className='opacity-0'>{encoded.substring(54, 58)}</div>
          <div className='absolute inset-0 mx-auto w-fit text-[8px] uppercase'>out</div>
        </div>
        <div className='ml-1 relative'>
          <div className='opacity-0'>{encoded.substring(58, 60)}</div>
        </div>
        <div className='ml-1 relative'>
          <div className='opacity-0'>{encoded.substring(60, 64)}</div>
          <div className='absolute inset-0 mx-auto w-fit text-[8px] uppercase'>in</div>
        </div>
        <div className='ml-1 relative'>
          <div className='opacity-0'>{encoded.substring(64)}</div>
        </div>
      </div>
    </div>
  )
}

export function SwapAmountAndFeeDisplay({ status, from, to, swap, srFee = swap.serviceFee.toNumber(), lpFee = swap.fee.toNumber(), hideSharingFee }) {
  let swapCoreError = false
  let amountWithoutCoreToken = swap.amount.sub(swap.amountForCoreToken)
  if (amountWithoutCoreToken.lt(0)) {
    swapCoreError = true
    amountWithoutCoreToken = swap.amount
  }

  let inAmount = ethers.utils.formatUnits(amountWithoutCoreToken, swap._isUCT() ? 4 : 6)
  let outAmount = ethers.utils.formatUnits(amountWithoutCoreToken.sub(srFee + lpFee).sub(swap.amountToShare), 6)
  const coreTokenAmount = ethers.utils.formatUnits(swap.coreTokenAmount, 6)
  const coreSymbol = presets.getCoreSymbol(to.network.id)
  if (swap.deprecatedEncoding) {
    inAmount = ethers.utils.formatUnits(swap.amount.add(swap.fee), swap._isUCT() ? 4 : 6)
    outAmount = ethers.utils.formatUnits(swap.amount, 6)
  }
  const feeSide = (swap.deprecatedEncoding || outAmount == 0) ? from : to

  return (
    <>
      <ListRow title='Amount'>
        {
          Number(inAmount) > 0 &&
          <div className={classnames(
            'w-fit relative flex items-center',
            CancelledStatus.includes(status) && 'opacity-30 before:block before:absolute before:w-full before:h-0.5 before:bg-black before:z-10'
          )}>
            {outAmount < 0 && <FailedIcon />}
            <div className='mr-1'>{inAmount}</div>
            <TagNetworkToken explorer={from.network.explorer} token={from.token} className={CancelledStatus.includes(status) && 'text-black'}/>
            <div className='text-sm text-gray-500 mx-1'>{'->'}</div>
            <div className='mr-1'>{outAmount}</div>
            {outAmount != 0 && <TagNetworkToken explorer={to.network.explorer} token={to.token} className={CancelledStatus.includes(status) && 'text-black'} />}
          </div>
        }
        {
          coreTokenAmount > 0 &&
          <div className={classnames(
            'w-fit relative flex items-center',
            CancelledStatus.includes(status) && 'opacity-30 before:block before:absolute before:w-full before:h-0.5 before:bg-black before:z-10'
          )}>
            {swapCoreError && <FailedIcon />}
            <div className='mr-1'>{ethers.utils.formatUnits(swap.amountForCoreToken, 6)}</div>
            <TagNetworkToken explorer={from.network.explorer} token={from.token} className={CancelledStatus.includes(status) && 'text-black'}/>
            <div className='text-sm text-gray-500 mx-1'>{'->'}</div>
            <div className='mr-1'>{coreTokenAmount}</div>
            <TagNetworkToken explorer={to.network.explorer} token={{ symbol: coreSymbol }} className={CancelledStatus.includes(status) && 'text-black'}/>
          </div>
        }
      </ListRow>
      {
        !FailedStatus.includes(status) &&
        <ListRow title='Fee'>
          <div className='flex items-center'>
            <div className='mr-1'>{ethers.utils.formatUnits(srFee + lpFee + swap.amountToShare.toNumber(), 6)}</div>
            <TagNetworkToken explorer={feeSide.network.explorer} token={feeSide.token} />
          </div>
          <div className={classnames('text-sm text-gray-500', srFee + lpFee + swap.amountToShare.toNumber() > 0 ? '' : 'hidden')}>
          {
            hideSharingFee && swap.amountToShare.gt(0)
            ? `${ethers.utils.formatUnits(srFee, 6)} Service fee + ${ethers.utils.formatUnits(lpFee, 6)} LP fee + ${ethers.utils.formatUnits(swap.amountToShare.toNumber(), 6)} Share fee`
            : `${ethers.utils.formatUnits(srFee, 6)} Service fee + ${ethers.utils.formatUnits(lpFee + swap.amountToShare.toNumber(), 6)} LP fee`
          }
          </div>
        </ListRow>
      }
    </>
  )
}

function SwapActionButton({ role, data, swap, status }) {
  const { rpcs } = useDealer()
  extensions.rpcs = rpcs

  if (!data) {
    return null
  }

  const posted = data.events.find(e => e.name === 'POSTED')
  const directSwap = data.events.filter(e => e.name === 'DIRECT-SWAP').length
  const locks = data.events.filter(e => e.name === 'LOCKED').length
  const unlocks = data.events.filter(e => e.name === 'UNLOCKED').length
  const releases = data.events.filter(e => e.name === 'RELEASED').length
  const executed = data.events.filter(e => e.name === 'EXECUTED').length

  if (executed && releases && locks && (releases + unlocks - locks === 0)) {
    return null
  }

  const initiator = data.initiator || data.fromTo[0]
  const recipient = data.fromTo[1]

  const btnBond = role && <Button size='sm' color='info' rounded onClick={() => extensions.bond(swap, data.signature, initiator)}>Bond</Button>
  const btnLock = role && <Button size='sm' color='info' rounded onClick={() => extensions.lock(swap, initiator, recipient)}>Lock</Button>
  const btnUnlock = role && <Button size='sm' color='info' rounded onClick={() => extensions.unlock(swap, initiator)}>Unlock</Button>
  const btnExecute = role && <Button size='sm' color='info' rounded onClick={() => extensions.execute(swap, data.releaseSignature, recipient)}>Execute</Button>
  const btnDirectExecute = role && <Button size='sm' color='info' rounded onClick={() => extensions.directExecute(swap, data.releaseSignature, initiator, recipient)}>DirectExecute</Button>
  const btnRelease = role && <Button size='sm' color='info' rounded onClick={() => extensions.release(swap, data.releaseSignature, initiator, recipient)}>Release</Button>
  const btnDirectRelease = role && <Button size='sm' color='info' rounded onClick={() => extensions.directRelease(swap, data.releaseSignature, initiator, recipient)}>DirectRelease</Button>
  const btnTransfer = role === 'root' && <Button size='sm' color='info' rounded onClick={() => extensions.transfer(swap, initiator, recipient)}>Transfer</Button>
  const btnWithdraw = <Button size='sm' color='info' rounded onClick={() => extensions.withdraw(swap)}>Withdraw</Button>
  const btnWithdrawTo = role === 'root' && <Button size='sm' color='info' rounded onClick={() => extensions.withdrawTo(swap, posted.tokenFrom)}>Withdraw To {abbreviate(posted?.tokenFrom, 4, 0)}</Button>
  const btnManualWithdraw = role === 'root' && <Button size='sm' color='info' rounded onClick={() => extensions.manualWithdraw(swap, initiator, posted.tokenFrom || data.fromTo[0])}>ManualWithdraw</Button>

  let actionButton = null
  switch (status) {
    case 'REQUESTING':
      if (directSwap) {
        actionButton = btnDirectExecute
      }
      break
    case 'POSTED':
      actionButton = data.fromContract ? btnExecute : btnBond
      break;
    case 'BONDED':
      actionButton = data.releaseSignature ? btnExecute : btnLock
      break;
    case 'EXPIRED*':
    case 'CANCELLED*':
      actionButton = btnUnlock
      break;
    case 'EXPIRED':
      if (data.releaseSignature) {
        actionButton = <>{btnExecute}{btnDirectRelease}</>
      } else if (!data.fromContract) {
        actionButton = btnWithdraw
      } else if (posted?.tokenFrom) {
        actionButton = <>{btnWithdrawTo}{btnDirectRelease}</>
      }
      break;
    case 'RELEASING':
      actionButton = btnRelease
      break
    case 'RELEASED':
      actionButton = btnExecute
      break
    case 'RELEASING*':
    case 'RELEASING...':
      if (unlocks >= locks) {
        if (!directSwap) {
          actionButton = <>{btnManualWithdraw}{btnDirectRelease}</>
        } else if (role === 'root') {
          if (swap.inToken === 32) {
            actionButton = btnTransfer
          } else {
            actionButton = <>{btnManualWithdraw}{btnDirectRelease}</>
          }
        }
        break
      }
    default:
      if (locks > releases + unlocks) {
        if (swap.expired) {
          actionButton = btnUnlock
        } else if (data.releaseSignature) {
          actionButton = btnRelease
        }
      } else if (!releases && !swap.expired) {
        actionButton = btnLock
      }
  }

  return (
    <div className='flex flex-row gap-1'>
      {actionButton}
    </div>
  )
}

export function SwapSaltBadges({ swap }) {
  const badges = []
  if (swap.willWaiveFee) {
    badges.push('No Service Fee')
  }
  if (['8'].includes(swap.salt[3])) {
    badges.push('Non-typed Signing')
  }
  if (['d', '9'].includes(swap.salt[2])) {
    badges.push('API')
  } else if (['6', '2'].includes(swap.salt[2])) {
    badges.push('meson.to')
  } else if (['e', 'a'].includes(swap.salt[2])) {
    badges.push('meson.to')
    badges.push('alls.to')
  }
  if (parseInt(swap.salt[4], 16) >= 8) {
    badges.push('Event Qulified')
  }
  return (
    <div className='flex gap-1'>
      {badges.map((text, i) => <Badge key={`badge-${i}`} type='info'>{text}</Badge>)}
    </div>
  )
}

function SwapStepName({ index, name }) {
  if (index === 0) {
    return 'Request by'
  } else if (index === 6) {
    return 'Release to'
  } else {
    return <span className='capitalize'>{name.split(':')[0].toLowerCase()}</span>
  }
}

function SwapStepInfo({ index, hash, recipient, name, fromAddress, from, to }) {
  if (index === 0) {
    return <ExternalLink href={getExplorerAddressLink(from.network, fromAddress)}>{fromAddress}</ExternalLink>
  } else if (index === 6) {
    return <ExternalLink href={getExplorerAddressLink(to.network, recipient)}>{recipient}</ExternalLink>
  }
  return (
    <div className='flex items-center'>
      {name.endsWith(':FAILED') && <FailedIcon />}
      <div className='truncate'>
        <ExternalLink href={getExplorerTxLink(([4, 5, 9].includes(index) ? to : from).network, hash)}>
          {hash}
        </ExternalLink>
      </div>
    </div>
  )
}

function FailedIcon() {
  return <div className='text-red-400 w-4 mr-1'><XCircleIcon className='w-4' aria-hidden='true' /></div>
}

function SwapTimes({ data, swap }) {
  if (data.released) {
    return (
      <>
        <ListRow title='Finished at'>{new Date(data.released).toLocaleString()}</ListRow>
        <ListRow title='Duration'>{getDuration(data.created, data.released)}</ListRow>
      </>
    )
  }
  if (!data.bonded && !data.posted) {
    return (
      <ListRow title='Will expire at'>
        {new Date((swap.expireTs - 3600) * 1000).toLocaleString()}
      </ListRow>
    )
  }
  return (
    <ListRow title={swap.expired ? 'Expired at' : 'Will expire at'}>
      {new Date(swap.expireTs * 1000).toLocaleString()}
    </ListRow>
  )
}

const lockStatus = {
  0: '⚪️',
  1: '🟠',
  4: '🟢',
  9: '🟠',
}
function OnChainStatus({ data, from, to }) {
  const { dealer } = useDealer()
  const [posted, setPosted] = React.useState()
  const [locked, setLocked] = React.useState()

  React.useEffect(() => {
    if (!dealer || !data || !from.network.id || !to.network.id) {
      return
    }
    const fromClient = dealer._createMesonClient(from.network)
    const toClient = dealer._createMesonClient(to.network)
    fromClient._getPostedSwap(data.encoded, { from: data.initiator }).then(setPosted)
    toClient._getLockedSwap(data.encoded, data.initiator, { from: data.initiator }).then(setLocked)
  }, [dealer, data, from.network, to.network])

  if (!data) {
    return null
  }
  const { exist, initiator, poolOwner } = posted || {}
  const { status, poolOwner: lockedPool } = locked || {}
  const executed = exist && !initiator
  return (
    <ListRow title='On-chain Status'>
      <div className='flex flex-row items-center gap-1'>
        <div>{posted ? [executed ? '🟢' : exist ? '🟠' : '⚪️', abbreviate(poolOwner, 4, 0)].join(' ') :  <Loading />}</div>
        <div>{locked ? [lockStatus[status], abbreviate(lockedPool, 4, 0)].join(' '): <Loading />}</div>
      </div>
    </ListRow>
  )
}
