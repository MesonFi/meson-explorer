import classnames from 'classnames'
import Image from 'next/image'

import { ExternalIcon } from 'components/ExternalLink'
import { getExplorerAddressLink } from 'lib/swap'

import ancient8 from './ancient8.png'
import aptos from './aptos.png'
import arb from './arb.png'
import aurora from './aurora.png'
import avax from './avax.png'
import b2 from './b2.png'
import base from './base.png'
import beam from './beam.png'
import bevm from './bevm.png'
import bnb from './bnb.png'
import celo from './celo.png'
import cfx from './cfx.png'
import core from './core.png'
import cronos from './cronos.png'
import eos from './eos.png'
import eth from './eth.png'
import evmos from './evmos.png'
import ftm from './ftm.png'
import gnosis from './gnosis.png'
import goshen from './goshen.png'
import kava from './kava.png'
import linea from './linea.png'
import manta from './manta.png'
import map from './map.png'
import merlin from './merlin.png'
import metis from './metis.png'
import mnt from './mnt.png'
import mode from './mode.png'
import movr from './movr.png'
import naut from './naut.png'
import one from './one.png'
import opt from './opt.png'
import polygon from './polygon.png'
import scroll from './scroll.png'
import sepolia from './sepolia.png'
import skaleEuropa from './skale-europa.png'
import skaleNebula from './skale-nebula.png'
import solana from './solana.png'
import starknet from './starknet.png'
import sui from './sui.png'
import taiko from './taiko.png'
import tron from './tron.png'
import viction from './viction.png'
import x1 from './x1.png'
import zeta from './zeta.png'
import zkevm from './zkevm.png'
import zkfair from './zkfair.png'
import zksync from './zksync.png'

const icons = {
  ancient8, aptos, arb, aurora, avax,
  b2, base, beam, bevm, bnb,
  celo, cfx, core, cronos,
  eos, eth, goerli: eth, evmos,
  ftm, gnosis, goshen, kava, linea,
  manta, map, merlin, metis, mnt, mode, movr, naut,
  one, opbnb: bnb, opt, polygon,
  scroll, sepolia, 'skale-europa': skaleEuropa, 'skale-nebula': skaleNebula, solana, starknet, sui,
  taiko, tron, viction,
  x1, zeta, zkevm, zkfair, zksync
}

export default function TagNetwork ({ responsive, size = 'sm', network, iconOnly, address, className }) {
  const iconId = network.id.replace(/-(testnet|sepolia|goerli)/, '')
  const icon = icons[iconId]
  return (
    <div className={classnames('flex items-center text-gray-500', size === 'sm' && 'text-xs', className)}>
      <div className={classnames('flex items-center rounded-full shadow', size === 'md' ? 'w-5 h-5' : 'w-4 h-4')}>
        {icon && <Image src={icon} alt='' />}
      </div>
      {
        !iconOnly &&
        <div className={classnames('items-center', size === 'md' ? 'ml-2' : 'ml-1', responsive ? 'hidden sm:flex' : 'flex')}>
          {network.name}
          {address && <ExternalIcon href={getExplorerAddressLink(network, address)} />}
        </div>
      }
    </div>
  )
}