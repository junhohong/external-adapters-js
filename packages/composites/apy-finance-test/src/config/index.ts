import { AdapterConfig } from '@chainlink/external-adapter-framework/config'

export const config = new AdapterConfig({
  RPC_URL: {
    description: 'The RPC URL to connect to the EVM chain',
    type: 'string',
    required: true,
  },
  CHAIN_ID: {
    description: 'The chain id to connect to',
    type: 'number',
    default: 1,
  },
  REGISTRY_ADDRESS: {
    description: 'The address of the deployed APY.Finance Registry contract',
    type: 'string',
    required: true,
  },
  TOKEN_ALLOCATION_ADAPTER_URL: {
    description: 'The URL of a Token Allocation external adapter',
    type: 'string',
    required: true,
  },
})
