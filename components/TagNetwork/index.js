import classnames from 'classnames'
import Image from 'next/image'

import { ExternalIcon } from '../ExternalLink'

import eth from './eth.png'
import bnb from './bnb.png'
import ava from './ava.png'
import matic from './matic.png'
import ftm from './ftm.png'
import arb from './arb.png'
import opt from './opt.png'
import one from './one.png'
import aurora from './aurora.png'
import cfx from './cfx.png'
import evmos from './evmos.png'
import movr from './movr.png'
import glmr from './glmr.png'
import trx from './trx.png'

const logos = { eth, bnb, ava, matic, ftm, arb, opt, one, aurora, cfx, evmos, movr, glmr, trx }

export default function TagNetwork ({ responsive, size = 'sm', network, iconOnly, address, className }) {
  const alias = network.alias?.toLowerCase() || network.networkAlias?.toLowerCase()
  const logo = logos[alias]
  return (
    <div className={classnames('flex items-center text-gray-500', size === 'sm' && 'text-xs', className)}>
      <div className={classnames('flex items-center rounded-full shadow', size === 'md' ? 'w-5 h-5 mr-2' : 'w-4 h-4 mr-1')}>
        {logo && <Image src={logo} alt='' />}
      </div>
      <div className={classnames('items-center', responsive ? 'hidden sm:flex' : 'flex')}>
        {!iconOnly && (network.networkName || network.name)}
        {address && <ExternalIcon href={`${network.explorer}/address/${address}`} />}
      </div>
    </div>
  )
}