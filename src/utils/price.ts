import { Fraction, Percent } from '@uniswap/sdk-core'
import { BlockNumber, BlockTag, getChecksumAddress, uint256 } from 'starknet'

import { provider } from '../services/provider'
import { USDCPair } from '../types'
import { QUOTE_TOKENS, Selector } from './constants'
import { decimalsScale } from './helpers'

export async function getPairPrice(pair: USDCPair, blockIdentifier: BlockNumber = BlockTag.latest) {
  return provider
    .callContract(
      {
        contractAddress: pair.address,
        entrypoint: Selector.GET_RESERVES,
        calldata: [],
      },
      blockIdentifier,
    )
    .then((res) => {
      const reserve0 = { low: res.result[0], high: res.result[1] }
      const reserve1 = { low: res.result[2], high: res.result[3] }

      const pairPrice = new Fraction(uint256.uint256ToBN(reserve1).toString(), uint256.uint256ToBN(reserve0).toString())

      return (pair.reversed ? pairPrice.invert() : pairPrice).multiply(decimalsScale(12))
    })
}

export async function getQuoteTokenPrice(quoteTokenAddress: string, blockIdentifier: BlockNumber = BlockTag.latest) {
  const quoteToken = QUOTE_TOKENS[getChecksumAddress(quoteTokenAddress)]
  if (!quoteToken) return

  if (quoteToken.usdcPair) {
    return getPairPrice(quoteToken.usdcPair, blockIdentifier)
  }

  return new Fraction(1, 1)
}

interface ParseCurrencyAmountOptions {
  fixed: number
  significant?: number
}

export const formatCurrenyAmount = (amount: Fraction, { fixed, significant = 1 }: ParseCurrencyAmountOptions) => {
  const fixedAmount = amount.toFixed(fixed)
  const significantAmount = amount.toSignificant(significant)

  if (+significantAmount > +fixedAmount) return significantAmount
  else return +fixedAmount.toString()
}

export const formatPercentage = (percentage: Percent) => {
  const formatedPercentage = +percentage.toFixed(2)
  const exact = percentage.equalTo(new Percent(Math.round(formatedPercentage * 100), 10000))

  return `${exact ? '' : '~'}${formatedPercentage}%`
}
