import { utils } from 'ethers'
import MultiExtensionManager from '@mesonfi/extensions'
import { adaptors } from '@mesonfi/sdk'
import TronWeb from 'tronweb'

import { TESTNET, RELAYERS } from 'lib/const'
import { presets, getSwapId } from 'lib/swap'

class ExtendedExtensionManager extends MultiExtensionManager {
  constructor(window, mesonPresets) {
    super(window, mesonPresets)
    this.rpcs = []
  }

  async bond (swap, signature, initiator) {
    const mesonClient = await this._getMesonClient(swap.inChain)
    await mesonClient?.bondSwap(swap.encoded)
  }

  async lock (swap, initiator, recipient) {
    const mesonClient = await this._getMesonClient(swap.outChain)
    await mesonClient?.lockSwap(swap.encoded, initiator, recipient)
  }

  async unlock (swap, initiator) {
    const mesonClient = await this._getMesonClient(swap.outChain)
    await mesonClient?.unlock({ encoded: swap.encoded, initiator })
  }

  async withdraw (swap) {
    const mesonClient = await this._getMesonClient(swap.inChain)
    await mesonClient?.cancelSwap(swap.encoded)
  }

  async withdrawTo (swap, recipient) {
    const mesonClient = await this._getMesonClient(swap.inChain)
    const body = { recipient }
    if (swap.inChain === '0x00c3') {
      body.recipient = TronWeb.address.toHex(recipient).replace(/^41/, '0x')
    }
    const res = await fetch(`${RELAYERS[0]}/api/v1/swap/from-contract/${swap.encoded}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const result = await res.json()
    const sig = utils.splitSignature(result.result)
    await mesonClient?.mesonInstance.cancelSwapTo(swap.encoded, recipient, sig.r, sig.yParityAndS)
  }

  async execute (swap, signature, recipient) {
    const mesonClient = await this._getMesonClient(swap.inChain)
    await mesonClient?.executeSwap({
      encoded: swap.encoded,
      signature,
      recipient
    }, true)
  }

  async release (swap, signature, initiator, recipient) {
    const mesonClient = await this._getMesonClient(swap.outChain)
    await mesonClient?.release({
      encoded: swap.encoded,
      signature,
      initiator,
      recipient
    })
  }

  async directExecute (swap, signature, initiator, recipient) {
    const mesonClient = await this._getMesonClient(swap.inChain)
    await mesonClient?.directExecuteSwap({
      encoded: swap.encoded,
      signature,
      initiator,
      recipient
    })
  }

  async directRelease (swap, signature = '0x'.padEnd(130, '0'), initiator, recipient) {
    const mesonClient = await this._getMesonClient(swap.outChain)
    const network = presets.getNetworkFromShortCoinType(swap.outChain)
    if (['tron', 'sui'].includes(network.id)) {
      await mesonClient?.mesonInstance.simpleRelease(swap.encoded, recipient)
      return
    }
    await mesonClient?.directRelease({
      encoded: swap.encoded,
      signature,
      initiator,
      recipient
    })
  }

  async manualWithdraw (swap, initiator, fromAddress) {
    const network = presets.getNetworkFromShortCoinType(swap.inChain)
    const mesonClient = await this._getMesonClient(swap.inChain)
    await mesonClient?.ready()
    const tx = await mesonClient?.transferToken(swap.inToken, fromAddress, swap.amount)
    await fetch(`${RELAYERS[0]}/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        networkId: network.id,
        swapId: getSwapId(swap.encoded, initiator),
        hash: tx.hash,
        event: 'CANCELLED'
      }),
    })
  }

  async transfer (swap, initiator, recipient) {
    const network = presets.getNetworkFromShortCoinType(swap.outChain)
    const mesonClient = await this._getMesonClient(swap.outChain)
    await mesonClient?.ready()
    const tx = await mesonClient?.transferToken(swap.outToken, recipient, swap.receive)
    await fetch(`${RELAYERS[0]}/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        networkId: network.id,
        swapId: getSwapId(swap.encoded, initiator),
        hash: tx.hash,
        event: 'RELEASED'
      }),
    })
  }

  async _getMesonClient (chain) {
    const network = presets.getNetworkFromShortCoinType(chain)
    if (!network) {
      return
    }
    if (!this.currentExt) {
      await this.connect(network.id)
    } else {
      await this.switch(network.id)
    }

    let urls = [network.url]
    const optUrls = this.rpcs?.filter(item => item.network === network.id).map(item => item.url)
    if (optUrls?.length) {
      urls = optUrls
    }

    let signer = this.extSigner
    if (network.id.startsWith('aptos')) {
      const client = this._mesonPresets.createNetworkClient(network.id, urls)
      signer = adaptors.aptos.getWalletFromExtension(this.currentExt, client)
    } else if (network.id.startsWith('sui')) {
      const client = this._mesonPresets.createNetworkClient(network.id, urls)
      signer = adaptors.sui.getWalletFromExtension(this.currentExt, client)
    } else if (network.id.startsWith('solana')) {
      const client = this._mesonPresets.createNetworkClient(network.id, urls)
      signer = adaptors.solana.getWalletFromExtension(this.currentExt, client)
    }
    return presets.createMesonClient(network.id, signer)
  }
}

const extensions = new ExtendedExtensionManager(global.window, presets)

export default extensions
