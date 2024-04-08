import { CallData, hash, stark, uint256 } from 'starknet'

import { BaseAdapter } from '../adapters/BaseAdapter'
import { DECIMALS, FACTORY_ADDRESS, Selector, TOKEN_CLASS_HASH } from '../utils/constants'
import { deployForm } from '../utils/formState'
import { decimalsScale } from '../utils/helpers'

export async function deploy(
  adapter: BaseAdapter,
  account: string,
  data: Required<NonNullable<ReturnType<typeof deployForm.getForm>>['values']>,
) {
  const salt = stark.randomAddress()

  const constructorCalldata = CallData.compile([
    data.ownerAddress,
    data.name,
    data.symbol,
    uint256.bnToUint256(BigInt(data.initialSupply) * BigInt(decimalsScale(DECIMALS))),
    salt,
  ])

  const tokenAddress = hash.calculateContractAddressFromHash(
    salt,
    TOKEN_CLASS_HASH,
    constructorCalldata.slice(0, -1),
    FACTORY_ADDRESS,
  )

  const result = await adapter.invokeTransaction({
    accountAddress: account,
    executionRequest: {
      calls: [
        {
          contractAddress: FACTORY_ADDRESS,
          entrypoint: Selector.CREATE_MEMECOIN,
          calldata: constructorCalldata,
        },
      ],
    },
  })

  if ('error' in result) return result

  return { tokenAddress, result: result.result }
}