import { AdapterEndpoint } from '@chainlink/external-adapter-framework/adapter'
import { makeLogger } from '@chainlink/external-adapter-framework/util'
import { InputParameters } from '@chainlink/external-adapter-framework/validation'
import { AdapterDataProviderError } from '@chainlink/external-adapter-framework/validation/error'
import { types } from '@chainlink/token-allocation-adapter'
import { BigNumber, ethers } from 'ethers'
import assetAllocationAbi from '../abi/IAssetAllocation.json'
import registryAbi from '../abi/IRegistry.json'
import { config } from '../config'
import { CompositeHttpTransport } from '../transports/composite-http'

const logger = makeLogger('apy-finance-test allocations')

const inputParameters = new InputParameters({})

export type AllocationsResponse = {
  Data: types.TokenAllocation[]
  Result: null
}

type EndpointTypes = {
  Parameters: typeof inputParameters.definition
  Response: AllocationsResponse
  Settings: typeof config.settings
}

const getAllocationDetails = async (
  registry: ethers.Contract,
  allocationId: string,
): Promise<types.TokenAllocation> => {
  const [symbol, balance, decimals] = await Promise.all([
    await registry.symbolOf(allocationId),
    await registry.balanceOf(allocationId),
    await registry.decimalsOf(allocationId),
  ])

  return {
    symbol,
    balance: BigNumber.from(balance).toString(),
    decimals: BigNumber.from(decimals).toNumber(),
  }
}

const httpTransport = new CompositeHttpTransport<EndpointTypes>({
  performRequest: async (_params, settings, _requestHandler) => {
    const { RPC_URL, CHAIN_ID, REGISTRY_ADDRESS } = settings
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL, CHAIN_ID)
    const registry = new ethers.Contract(REGISTRY_ADDRESS, registryAbi, provider)

    const providerDataRequested = Date.now()

    const chainlinkRegistryAddress = await registry.chainlinkRegistryAddress().catch((e: any) => {
      logger.error(
        `Failed to fetch Chainlink Registry address from Registry contract: ${REGISTRY_ADDRESS}`,
      )
      throw new AdapterDataProviderError(
        {
          statusCode: 502,
          url: RPC_URL,
          cause: e,
        },
        {
          providerDataRequestedUnixMs: providerDataRequested,
          providerDataReceivedUnixMs: 0,
          providerIndicatedTimeUnixMs: undefined,
        },
      )
    })

    const chainlinkRegistry = new ethers.Contract(
      chainlinkRegistryAddress,
      assetAllocationAbi,
      provider,
    )

    const allocationIds: string[] = await chainlinkRegistry
      .getAssetAllocationIds()
      .catch((e: any) => {
        logger.error(
          `Failed to fetch asset allocation IDs from Chainlink Registry contract: ${chainlinkRegistryAddress}`,
        )
        throw new AdapterDataProviderError(
          {
            statusCode: 502,
            url: RPC_URL,
            cause: e,
          },
          {
            providerDataRequestedUnixMs: providerDataRequested,
            providerDataReceivedUnixMs: 0,
            providerIndicatedTimeUnixMs: undefined,
          },
        )
      })

    const allocations = await Promise.all(
      allocationIds.map((allocationId) => getAllocationDetails(chainlinkRegistry, allocationId)),
    ).catch((e: any) => {
      logger.error(
        `Failed to fetch details for allocations from Chainlink Registry contract: ${chainlinkRegistryAddress}`,
      )
      throw new AdapterDataProviderError(
        {
          statusCode: 502,
          url: RPC_URL,
          cause: e,
        },
        {
          providerDataRequestedUnixMs: providerDataRequested,
          providerDataReceivedUnixMs: 0,
          providerIndicatedTimeUnixMs: undefined,
        },
      )
    })

    return {
      params: {},
      response: {
        data: allocations,
        result: null,
        timestamps: {
          providerDataRequestedUnixMs: providerDataRequested,
          providerDataReceivedUnixMs: Date.now(),
          providerIndicatedTimeUnixMs: undefined,
        },
      },
    }
  },
})

export const endpoint = new AdapterEndpoint<EndpointTypes>({
  name: 'allocations',
  transport: httpTransport,
  inputParameters: inputParameters,
})
