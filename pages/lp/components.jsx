import React from 'react'
import classnames from 'classnames'

import { useSession } from 'next-auth/react'
import { RefreshIcon } from '@heroicons/react/solid'
import { BigNumber, ethers } from 'ethers'
import { Multicall } from 'ethereum-multicall'
import { MesonClient, adaptors } from '@mesonfi/sdk'
import { Meson, ERC20 } from '@mesonfi/contract-abis'

import ListRow, { ListRowWrapper } from 'components/ListRow'
import TagNetwork from 'components/TagNetwork'
import TagNetworkToken from 'components/TagNetworkToken'
import ExternalLink from 'components/ExternalLink'
import NumberDisplay from 'components/NumberDisplay'

import fetcher from 'lib/fetcher'
import { getAllNetworks, getExplorerAddressLink } from 'lib/swap'

const CORE_ALERT = {
  eth: 0.01,
  bnb: 0.1,
  polygon: 0.1,
  evmos: 0.001,
  arb: 0.05,
  opt: 0.05,
  aurora: 0.00001,
  cfx: 0.01,
  avax: 0.1,
  ftm: 1,
  tron: 50,
  one: 10,
  movr: 0.05,
  beam: 0.1,
  zksync: 0.05,
  zkfair: 5,
}

export function LpContent ({ address, addressByNetwork, dealer, withSrFee = true, noColor }) {
  const { data: session } = useSession()
  const checkDifference = !address && session?.user?.roles?.some(r => ['root'].includes(r))

  const [totalDeposit, setTotalDeposit] = React.useState({})
  const [totalBalance, setTotalBalance] = React.useState({})
  const [totalSrFeeCollected, setTotalSrFeeCollected] = React.useState({})
  const [totalInContractDiff, setTotalInContractDiff] = React.useState({})

  React.useEffect(() => {
    setTotalDeposit({})
    setTotalBalance({})
    setTotalSrFeeCollected({})
    setTotalInContractDiff({})
  }, [address])

  const add = React.useMemo(() => ({
    toDeposit: (delta, tokenType) => setTotalDeposit(prev => ({ ...prev, [tokenType]: BigNumber.from(prev[tokenType] || 0).add(delta) })),
    toBalance: (delta, tokenType) => setTotalBalance(prev => ({ ...prev, [tokenType]: BigNumber.from(prev[tokenType] || 0).add(delta) })),
    toSrFee: (delta, tokenType) => setTotalSrFeeCollected(prev => ({ ...prev, [tokenType]: BigNumber.from(prev[tokenType] || 0).add(delta) })),
    toInContractDiff: (delta, tokenType) => setTotalInContractDiff(prev => ({ ...prev, [tokenType]: BigNumber.from(prev[tokenType] || 0).add(delta) })),
  }), [])

  const networkRows = React.useMemo(() => {
    if (address) {
      const isSolanaAddress = adaptors.isAddress('solana', address)
      return getAllNetworks()
        .filter(n => {
          if (isSolanaAddress) {
            return n.addressFormat === 'solana'
          } else if (address.length === 66) {
            return ['aptos', 'sui'].includes(n.addressFormat)
          } else {
            return ['ethers'].includes(n.addressFormat)
          }
        })
        .map(n => <LpContentRow key={n.id} address={address} dealer={dealer} network={n} noColor={noColor} add={add} />)
    } else {
      const defaultAddress = addressByNetwork.default
      const keys = Object.keys(addressByNetwork)
      const networkRowsByType = Object.fromEntries(keys.map(k => [k, []]))
      networkRowsByType.default = []
      getAllNetworks().filter(n => n.mesonAddress).forEach(n => {
        const matchKey = keys.find(k => n.id.startsWith(k))
        if (matchKey) {
          networkRowsByType[matchKey].push(
            <LpContentRow key={n.id} address={addressByNetwork[matchKey]} withSrFee={withSrFee} checkDifference={checkDifference} dealer={dealer} network={n} noColor={noColor} add={add} />
          )
        } else if (defaultAddress) {
          networkRowsByType.default.push(
            <LpContentRow key={n.id} address={defaultAddress} withSrFee={withSrFee} checkDifference={checkDifference} dealer={dealer} network={n} noColor={noColor} add={add} />
          )
        }
      })
      return keys
        .map(k => [
          <ListRowWrapper key={k} size='xs'>
            <div className='text-gray-500'>
              {/* <div className='font-medium text-sm'>{k[0].toUpperCase()}{k.substring(1)}</div> */}
              <div className='truncate text-sm'>{addressByNetwork[k]}</div>
            </div>
          </ListRowWrapper>,
          ...networkRowsByType[k]
        ])
        .flat()
    }
  }, [address, addressByNetwork, withSrFee, checkDifference, dealer, noColor, add])

  const tokens = ['eth', 'btc', 'bnb', 'stablecoins', '1']

  return (
    <dl className={!address && (checkDifference ? 'min-w-[600px]' : 'min-w-[440px]')}>
      <ListRowWrapper size='sm'>
        <dt className='flex-1'>
          <div className='flex flex-1 flex-col'>
            <div className='text-xs font-medium text-gray-500 uppercase'>Total</div>
            {tokens.map(t => <TokenTotalAmountSum key={t} totalDeposit={totalDeposit} totalBalance={totalBalance} totalSrFeeCollected={withSrFee && totalSrFeeCollected} token={t} />)}
          </div>
        </dt>
        <dd className='md:flex-[2] mt-1 md:mt-0 md:min-w-[540px]'>
          <div className='flex items-center'>
            <div className='flex flex-1 flex-col'>
              <div className='text-xs font-medium text-gray-500 uppercase'>Pool Balance</div>
              {tokens.map(t => <TokenAmountSum key={t} data={totalDeposit} token={t} />)}
            </div>
            <div className='flex flex-1 flex-col'>
              <div className='text-xs font-medium text-gray-500 uppercase'>Balance</div>
              {tokens.map(t => <TokenAmountSum key={t} data={totalBalance} token={t} />)}
            </div>
            {
              !address && withSrFee &&
              <div className='flex flex-1 flex-col'>
                <div className='text-xs font-medium text-gray-500 uppercase'>Fee Collected</div>
                {tokens.map(t => <TokenAmountSum key={t} data={totalSrFeeCollected} token={t} />)}
              </div>
            }
            {
              !address && checkDifference &&
              <>
                <div className='flex flex-1 flex-col min-w-[142.5px]'>
                  <div className='text-xs font-medium text-gray-500 uppercase'>Difference</div>
                  {tokens.map(t => <TokenAmountSum key={t} plus data={totalInContractDiff} token={t} />)}
                </div>
              </>
            }
          </div>
        </dd>
      </ListRowWrapper>
      {networkRows}
    </dl>
  )
}

function TokenTotalAmountSum ({ totalDeposit, totalBalance, totalSrFeeCollected, token }) {
  return (
    <div className='flex items-center'>
      <NumberDisplay
        className='font-bold'
        value={ethers.utils.formatUnits(BigNumber.from(totalDeposit[token] || 0).add(totalBalance[token] || 0).add(totalSrFeeCollected?.[token] || 0), 6)}
      />
      <TagNetworkToken token={{ symbol: token.toUpperCase() }} iconOnly />
    </div>
  )
}

function TokenAmountSum ({ data, token, plus }) {
  return (
    <div className='flex items-center'>
      {plus && <div className='ml-1 text-sm font-mono'>+</div>}
      <NumberDisplay value={ethers.utils.formatUnits(BigNumber.from(data[token] || 0), 6)} />
      <TagNetworkToken token={{ symbol: token.toUpperCase() }} iconOnly />
    </div>
  )
}

function LpContentRow ({ address, withSrFee, checkDifference, dealer, network, noColor, add }) {
  const [core, setCore] = React.useState()

  const { mesonClient, multicall } = React.useMemo(() => {
    const mesonClient = dealer._createMesonClient({
      id: network.id,
      url: network.url.replace('${INFURA_API_KEY}', process.env.NEXT_PUBLIC_INFURA_PROJECT_ID)
    })

    let multicall
    if (network.addressFormat === 'ethers') {
      const multicallOption = {
        ethersProvider: mesonClient.provider,
        tryAggregate: true,
      }
      if ([
        'naut', 'bevm', 'zkfair', 'map', 'ancient8', 'zeta', 'merlin',
        'viction-testnet', 'taiko-testnet', 'b2-testnet', 'merlin-testnet', 'goshen-testnet'
      ].includes(network.id)) {
        // TODO
        return { mesonClient }
      } else if (network.id.startsWith('cfx')) {
        multicallOption.multicallCustomContractAddress = '0xEFf0078910f638cd81996cc117bccD3eDf2B072F'
      } else if (!network.id.startsWith('zksync')) {
        multicallOption.multicallCustomContractAddress = '0xcA11bde05977b3631167028862bE2a173976CA11'
      }
      multicall = new Multicall(multicallOption)
    }

    return { mesonClient, multicall }
  }, [dealer, network])

  const nativeDecimals = network.nativeCurrency?.decimals || 18
  React.useEffect(() => {
    if (!address) {
      return
    }
    mesonClient.getBalance(address)
      .then(v => setCore(v.div(10 ** (nativeDecimals - 6))))
      .catch(err => console.error(err))
  }, [mesonClient, address, nativeDecimals])

  const alert = (CORE_ALERT[network.id] || 0.01) * 1e6
  const tokens = [...network.tokens].sort((t1, t2) => Math.abs(64 - t2.tokenIndex) - Math.abs(64 - t1.tokenIndex))
  if (network.uctAddress) {
    tokens.push({ symbol: 'UCT', addr: network.uctAddress, decimals: 6, tokenIndex: 255, disabled: true })
  }

  const [cursor, setCursor] = React.useState(null)
  const [retrievePage, setRetrievePage] = React.useState('')
  const retrieve = async () => {
    const page = retrievePage || 1
    const txs = await fetcher.post(`admin/retrieve`, { networkId: network.id, page, cursor })
    const nextCursor = txs && txs[txs.length - 1]
    setRetrievePage(page + 1)
    if (nextCursor) {
      setCursor(nextCursor)
    }
  }
  const retrieveButton = (
    <div className='ml-1 flex items-center cursor-pointer hover:text-indigo-500' onClick={retrieve}>
      <RefreshIcon className='w-3.5 h-3.5' aria-hidden='true' />
      <div className='ml-0.5 text-xs'>{retrievePage}</div>
    </div>
  )

  return (
    <ListRow
      size='sm'
      title={
        <div className='flex flex-row md:flex-col align-start justify-between'>
          <div className='self-start flex flex-row items-center'>
            <ExternalLink
              size='md'
              className='flex flex-row normal-case'
              href={getExplorerAddressLink(network, network.mesonAddress)}
            >
              <TagNetwork size='md' network={network} iconOnly />
              <div className='ml-2 font-medium'>{network.name}</div>
            </ExternalLink>
            {retrieveButton}
          </div>
          <NumberDisplay
            value={core && ethers.utils.formatUnits(core, 6)}
            length={3}
            symbol={network.nativeCurrency?.symbol || 'ETH'}
            className={classnames(
              'flex ml-7 mt-0.5 text-xs font-mono',
              !noColor && core?.lte(alert) && 'bg-red-500 text-white',
              !noColor && core?.gt(alert) && core?.lte(alert * 3) && 'text-red-500',
              !noColor && core?.gt(alert * 3) && core?.lte(alert * 10) && 'text-warning',
              !noColor && core?.gt(alert * 10) && core?.lte(alert * 20) && 'text-indigo-500',
            )}
          />
        </div>
      }
    >
      <TokenAmountRows 
        address={address}
        mesonClient={mesonClient}
        multicall={multicall}
        core={core}
        withSrFee={withSrFee}
        checkDifference={checkDifference}
        tokens={tokens}
        explorer={network.explorer}
        noColor={noColor}
        add={add}
      />
    </ListRow>
  )
}

function TokenAmountRows ({ address, mesonClient, multicall, core, checkDifference, withSrFee, tokens, explorer, noColor, add }) {
  const [deposit, setDeposit] = React.useState({})
  const [balance, setBalance] = React.useState({})
  const [srFeeCollected, setSrFeeCollected] = React.useState({})
  const [inContractDiff, setInContractDiff] = React.useState({})

  React.useEffect(() => {
    if (!address || !core) {
      return
    }

    (async function () {
      await mesonClient.ready({ from: address }).catch(() => {})
      const token = mesonClient._tokens.find(token => Number(token.addr) === 1)
      if (token) {
        const tokenType = MesonClient.tokenType(token.tokenIndex)
        add.toBalance(core, tokenType)
        setBalance(v => ({ ...v, [token.tokenIndex]: core }))
      }
    })()
  }, [address, mesonClient, core, add])

  React.useEffect(() => {
    if (!address) {
      return
    }

    (async function () {
      await mesonClient.ready({ from: address }).catch(() => {})
      
      if (multicall) {
        const { results: { meson, ...tokens } } = await multicall.call([
          {
            reference: 'meson',
            contractAddress: mesonClient.address,
            abi: Meson.abi,
            calls: mesonClient._tokens.map(token => ([
              { reference: token.tokenIndex, methodName: 'poolTokenBalance', methodParameters: [token.addr, address] },
              { reference: token.tokenIndex, methodName: 'serviceFeeCollected', methodParameters: [token.tokenIndex] },
            ])).flat()
          },
          ...mesonClient._tokens.filter(token => !mesonClient.isCoreToken(token.tokenIndex)).map(token => ({
            reference: token.tokenIndex,
            contractAddress: token.addr,
            abi: ERC20.abi,
            calls: [
              { reference: 'decimals', methodName: 'decimals', methodParameters: [] },
              { reference: 'balanceOf', methodName: 'balanceOf', methodParameters: [address] },
              { reference: 'balanceOfMeson', methodName: 'balanceOf', methodParameters: [mesonClient.address] },
            ],
          }))
        ])

        const depositPlusSrFee = {}
        meson?.callsReturnContext.forEach(result => {
          const tokenIndex = result.reference
          const tokenType = MesonClient.tokenType(tokenIndex)
          const value = BigNumber.from(result.returnValues[0].hex)
          if (result.methodName === 'poolTokenBalance') {
            if (tokenIndex !== 32) {
              add.toDeposit(value, tokenType)
            }
            setDeposit(v => ({ ...v, [tokenIndex]: value }))
            depositPlusSrFee[tokenIndex] = value
          } else if (result.methodName === 'serviceFeeCollected') {
            if (tokenIndex !== 32) {
              add.toSrFee(value, tokenType)
            }
            setSrFeeCollected(v => ({ ...v, [tokenIndex]: value }))
            depositPlusSrFee[tokenIndex] = depositPlusSrFee[tokenIndex].add(value)
          }
        })
        mesonClient._tokens.forEach(async token => {
          const tokenIndex = token.tokenIndex
          const tokenType = MesonClient.tokenType(tokenIndex)
          let decimals, balance, balanceOfMeson

          if (mesonClient.isCoreToken(token.tokenIndex)) {
            balanceOfMeson = (await mesonClient.inContractTokenBalance(tokenIndex)).value
          } else {
            tokens[tokenIndex].callsReturnContext.forEach(result => {
              const returnValue = result.returnValues[0]
              if (result.reference === 'decimals') {
                decimals = returnValue 
              } else if (result.reference === 'balanceOf') {
                balance = BigNumber.from(returnValue.hex)
              } else if (result.reference === 'balanceOfMeson') {
                balanceOfMeson = BigNumber.from(returnValue.hex)
              }
            })
            balance = balance.div(10 ** (decimals - 6))
            balanceOfMeson = balanceOfMeson.div(10 ** (decimals - 6))
            if (tokenIndex !== 32) {
              add.toBalance(balance, tokenType)
            }
            setBalance(v => ({ ...v, [tokenIndex]: balance }))
          }
          
          const inContractDiff = balanceOfMeson.sub(depositPlusSrFee[tokenIndex])
          if (tokenIndex !== 32) {
            add.toInContractDiff(inContractDiff, tokenType)
          }
          setInContractDiff(v => ({ ...v, [tokenIndex]: inContractDiff }))
        })
        return
      }

      mesonClient._tokens.forEach(async token => {
        const tokenIndex = token.tokenIndex
        const tokenType = MesonClient.tokenType(tokenIndex, true)
        const doNotAdd = tokenType === 'pod' || (tokenIndex === 255 && Number(token.addr) !== 1)

        const deposit = await mesonClient.getBalanceInPool(address, tokenIndex).catch(() => {})
        if (deposit) {
          if (!doNotAdd) {
            add.toDeposit(deposit.value, tokenType)
          }
          setDeposit(v => ({ ...v, [tokenIndex]: deposit.value }))
        }
        
        if (!doNotAdd) {
          const tokenBalance = await mesonClient.getTokenBalance(address, tokenIndex).catch(() => {})
          if (tokenBalance) {
            add.toBalance(tokenBalance.value, tokenType)
            setBalance(v => ({ ...v, [tokenIndex]: tokenBalance.value }))
          }
        } else {
          setBalance(v => ({ ...v, [tokenIndex]: BigNumber.from(0) }))
        }
        
        if (withSrFee) {
          const srFee = await mesonClient.serviceFeeCollected(tokenIndex, { from: address }).catch(() => {})
          if (srFee) {
            if (!doNotAdd) {
              add.toSrFee(srFee.value, tokenType)
            }
            setSrFeeCollected(v => ({ ...v, [tokenIndex]: srFee.value }))
          }
        }

        if (address.length === 66) {
          const diff = await mesonClient.pendingTokenBalance(tokenIndex).catch(() => {})
          if (diff) {
            if (!doNotAdd) {
              add.toInContractDiff(diff.value, tokenType)
            }
            setInContractDiff(v => ({ ...v, [tokenIndex]: diff.value }))
          }
        }
      })
    })()
  }, [address, mesonClient, multicall, add, withSrFee])

  return tokens.map(t => (
    <TokenAmount
      key={t.addr}
      withSrFee={withSrFee}
      checkDifference={checkDifference}
      token={t}
      explorer={explorer}
      noColor={noColor}
      deposit={deposit[t.tokenIndex]}
      balance={balance[t.tokenIndex]}
      srFeeCollected={srFeeCollected[t.tokenIndex]}
      inContractDiff={inContractDiff[t.tokenIndex]}
    />
  ))
}

function TokenAmount ({ withSrFee, checkDifference, token, explorer, noColor, deposit, balance, srFeeCollected, inContractDiff }) {

  // React.useEffect(() => {
  //   if (!checkDifference || !address || !deposit || !srFeeCollected) {
  //     return
  //   }
  //   (async () => {
  //     const tokenType = MesonClient.tokenType(token.tokenIndex)
  //     if (address.length === 66) {
  //       const diff = await mesonClient.pendingTokenBalance(token.tokenIndex).catch(() => {})
  //       if (diff) {
  //         if (token.tokenIndex !== 32) {
  //           add.toInContractDiff(diff.value, tokenType)
  //         }
  //         setInContractDiff(diff.value)
  //       }
  //     } else {
  //       const inContractBalance = await mesonClient.inContractTokenBalance(token.tokenIndex, { from: address }).catch(() => {})
  //       if (inContractBalance) {
  //         const diff = inContractBalance.value.sub(deposit).sub(srFeeCollected)
  //         if (token.tokenIndex !== 32) {
  //           add.toInContractDiff(diff, tokenType)
  //         }
  //         setInContractDiff(diff)
  //       }
  //     }
  //   })()
  // }, [address, checkDifference, deposit, srFeeCollected]) // eslint-disable-line react-hooks/exhaustive-deps

  if (token.symbol === 'UCT' && !deposit) {
    return null
  }

  return (
    <div className='flex items-center'>
      <div className='flex flex-1 items-center h-5'>
        <div className={classnames(
          'flex items-center relative',
          token.disabled && 'after:block after:absolute after:w-full after:h-0.5 after:bg-gray-500'
        )}>
          <NumberDisplay
            value={deposit && ethers.utils.formatUnits(deposit, 6)}
            className={getDepositAmountClassName(token, deposit, noColor)}
          />
          <TagNetworkToken explorer={explorer} token={token} iconOnly />
        </div>
      </div>

      <div className='flex flex-1 items-center h-5'>
        <div className={classnames(
          'flex items-center relative',
          token.disabled && 'after:block after:absolute after:w-full after:h-0.5 after:bg-gray-500'
        )}>
          <NumberDisplay
            value={balance && ethers.utils.formatUnits(balance, 6)}
            className={getAmountClassName(token, balance)}
          />
          <TagNetworkToken explorer={explorer} token={token} iconOnly />
        </div>
      </div>
      {
        withSrFee &&
        <div className='flex flex-1 items-center h-5'>
          <div className={classnames(
            'flex items-center relative',
            token.disabled && 'after:block after:absolute after:w-full after:h-0.5 after:bg-gray-500'
          )}>
            <NumberDisplay
              value={srFeeCollected && ethers.utils.formatUnits(srFeeCollected, 6)}
              className={getAmountClassName(token, srFeeCollected)}
            />
            <TagNetworkToken explorer={explorer} token={token} iconOnly />
          </div>
        </div>
      }
      {
        checkDifference &&
        <>
          <div className='flex flex-1 items-center h-5'>
            <div className={classnames('ml-1 w-2 text-sm font-mono', token.disabled ? 'text-transparent' : 'text-gray-500')}>+</div>
            <div className={classnames(
              'flex items-center relative',
              token.disabled && 'after:block after:absolute after:w-full after:h-0.5 after:bg-gray-500'
            )}>
              <NumberDisplay
                value={inContractDiff && ethers.utils.formatUnits(inContractDiff, 6)}
                className={getAmountClassName(token, inContractDiff)}
              />
              <TagNetworkToken explorer={explorer} token={token} iconOnly />
            </div>
          </div>
        </>
      }
    </div>
  )
}

function getAmountClassName (token, amount) {
  if (token.disabled) {
    return 'text-gray-300'
  } else if (token.tokenIndex >= 191) {
    return classnames(amount?.lt(1e3) && 'text-gray-300')
  } else {
    return classnames(amount?.lt(1e6) && 'text-gray-300')
  }
}

function getDepositAmountClassName (token, deposit, noColor) {
  if (token.disabled) {
    return 'text-gray-300'
  } else if (token.tokenIndex >= 191) {
    return classnames(
      !noColor && deposit?.lte(1e6) && 'bg-red-500 text-white',
      !noColor && deposit?.gt(1e6) && deposit?.lte(5e6) && 'text-red-500',
      !noColor && deposit?.gt(5e6) && deposit?.lte(10e6) && 'text-warning',
      !noColor && deposit?.gt(10e6) && deposit?.lte(20e6) && 'text-indigo-500'
    )
  } else {
    return classnames(
      !noColor && deposit?.lte(1000e6) && 'bg-red-500 text-white',
      !noColor && deposit?.gt(1000e6) && deposit?.lte(5000e6) && 'text-red-500',
      !noColor && deposit?.gt(5000e6) && deposit?.lte(10000e6) && 'text-warning',
      !noColor && deposit?.gt(10000e6) && deposit?.lte(20000e6) && 'text-indigo-500'
    )
  }
}
