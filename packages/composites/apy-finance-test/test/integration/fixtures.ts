import { Adapter } from '@chainlink/external-adapter-framework/adapter'
import nock from 'nock'
import { config } from '../../src/config'
import { allocations, tvl } from '../../src/endpoint'

type JsonRpcPayload = {
  id: number
  method: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Array<any> | Record<string, any>
  jsonrpc: '2.0'
}

export const createAdapter = (): Adapter => {
  return new Adapter({
    name: 'APY_FINANCE',
    endpoints: [allocations, tvl],
    defaultEndpoint: tvl.name,
    config,
  })
}

export const mockAllocationsEndpoint = (allocationsAdapterUrl: string): nock.Scope => {
  return nock(allocationsAdapterUrl, { encodedQueryParams: true, allowUnmocked: true })
    .persist()
    .post('/', { data: { endpoint: 'allocations' } })
    .reply(
      200,
      {
        data: [
          {
            symbol: 'DAI',
            balance: '0',
            decimals: 18,
          },
          {
            symbol: 'USDC',
            balance: '910158472067',
            decimals: 6,
          },
        ],
        result: null,
        timestamps: {
          providerDataRequestedUnixMs: new Date().getTime(),
          providerDataReceivedUnixMs: new Date().getTime(),
        },
        statusCode: 200,
        meta: {
          adapterName: 'APY_FINANCE',
          metrics: {
            feedId: 'N/A',
          },
        },
      },
      ['Content-Type', 'application/json'],
    )
}

export const mockTokenAllocationsAdapter = (tokenAllocationAdapterUrl: string): nock.Scope => {
  return nock(tokenAllocationAdapterUrl, { encodedQueryParams: true })
    .persist()
    .post('/', {
      data: {
        source: 'tiingo',
        quote: 'USD',
        allocations: [
          {
            symbol: 'DAI',
            balance: '0',
            decimals: 18,
          },
          {
            symbol: 'USDC',
            balance: '910158472067',
            decimals: 6,
          },
        ],
      },
    })
    .reply(200, {
      jobRunID: '1',
      result: 910164.4373738351,
      providerStatusCode: 200,
      statusCode: 200,
      data: {
        sources: [],
        payload: {
          DAI: {
            quote: {
              USD: {
                price: 0.9997940587259735,
              },
            },
          },
          USDC: {
            quote: {
              USD: {
                price: 1.0000065541408647,
              },
            },
          },
        },
        result: 910164.4373738351,
      },
      metricsMeta: {
        feedId:
          '{"data":{"source":"tiingo","quote":"USD","allocations":[{"symbol":"DAI","balance":"0","decimals":18},{"symbol":"USDC","balance":"910158472067","decimals":6}]}}',
      },
    })
}

export const mockRpc = (rpcUrl: string): nock.Scope => {
  return nock(rpcUrl, { encodedQueryParams: true })
    .persist()
    .post('/', { method: 'eth_chainId', params: [], id: /^\d+$/, jsonrpc: '2.0' })
    .reply(
      200,
      (_, request: JsonRpcPayload) => ({ jsonrpc: '2.0', id: request.id, result: '0x1' }),
      ['Content-Type', 'application/json'],
    )
    .post('/', {
      method: 'eth_call',
      params: [{ to: '0x7ec81b7035e91f8435bdeb2787dcbd51116ad303', data: '0xfcbf6ef8' }, 'latest'],
      id: /^\d+$/,
      jsonrpc: '2.0',
    })
    .reply(
      200,
      (_, request: JsonRpcPayload) => ({
        jsonrpc: '2.0',
        id: request['id'],
        result: '0x00000000000000000000000074a07a137e347590b7d6fa63b70c2c331af94a8b',
      }),
      ['Content-Type', 'application/json'],
    )
    .post('/', {
      method: 'eth_call',
      params: [{ to: '0x74a07a137e347590b7d6fa63b70c2c331af94a8b', data: '0xd8de0947' }, 'latest'],
      id: /^\d+$/,
      jsonrpc: '2.0',
    })
    .reply(
      200,
      (_, request: JsonRpcPayload) => ({
        jsonrpc: '2.0',
        id: request['id'],
        result:
          '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000021893e362eeaefe364facfb30daa986746b65eb670000000000000000000000001893e362eeaefe364facfb30daa986746b65eb67010000000000000000000000',
      }),
      ['Content-Type', 'application/json'],
    )
    .post('/', {
      method: 'eth_call',
      params: [
        {
          to: '0x74a07a137e347590b7d6fa63b70c2c331af94a8b',
          data: '0xd87e053c1893e362eeaefe364facfb30daa986746b65eb67010000000000000000000000',
        },
        'latest',
      ],
      id: /^\d+$/,
      jsonrpc: '2.0',
    })
    .reply(
      200,
      (_, request: JsonRpcPayload) => ({
        jsonrpc: '2.0',
        id: request['id'],
        result:
          '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000045553444300000000000000000000000000000000000000000000000000000000',
      }),
      ['Content-Type', 'application/json'],
    )
    .post('/', {
      method: 'eth_call',
      params: [
        {
          to: '0x74a07a137e347590b7d6fa63b70c2c331af94a8b',
          data: '0xd87e053c1893e362eeaefe364facfb30daa986746b65eb67000000000000000000000000',
        },
        'latest',
      ],
      id: /^\d+$/,
      jsonrpc: '2.0',
    })
    .reply(
      200,
      (_, request: JsonRpcPayload) => ({
        jsonrpc: '2.0',
        id: request['id'],
        result:
          '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000034441490000000000000000000000000000000000000000000000000000000000',
      }),
      ['Content-Type', 'application/json'],
    )
    .post('/', {
      method: 'eth_call',
      params: [
        {
          to: '0x74a07a137e347590b7d6fa63b70c2c331af94a8b',
          data: '0x6c7f15421893e362eeaefe364facfb30daa986746b65eb67000000000000000000000000',
        },
        'latest',
      ],
      id: /^\d+$/,
      jsonrpc: '2.0',
    })
    .reply(
      200,
      (_, request: JsonRpcPayload) => ({
        jsonrpc: '2.0',
        id: request['id'],
        result: '0x0000000000000000000000000000000000000000000000000000000000000000',
      }),
      ['Content-Type', 'application/json'],
    )
    .post('/', {
      method: 'eth_call',
      params: [
        {
          to: '0x74a07a137e347590b7d6fa63b70c2c331af94a8b',
          data: '0x6c7f15421893e362eeaefe364facfb30daa986746b65eb67010000000000000000000000',
        },
        'latest',
      ],
      id: /^\d+$/,
      jsonrpc: '2.0',
    })
    .reply(
      200,
      (_, request: JsonRpcPayload) => ({
        jsonrpc: '2.0',
        id: request['id'],
        result: '0x000000000000000000000000000000000000000000000000000000d2158f7044',
      }),
      ['Content-Type', 'application/json'],
    )
    .post('/', {
      method: 'eth_call',
      params: [
        {
          to: '0x74a07a137e347590b7d6fa63b70c2c331af94a8b',
          data: '0xdab09d9f1893e362eeaefe364facfb30daa986746b65eb67000000000000000000000000',
        },
        'latest',
      ],
      id: /^\d+$/,
      jsonrpc: '2.0',
    })
    .reply(
      200,
      (_, request: JsonRpcPayload) => ({
        jsonrpc: '2.0',
        id: request['id'],
        result: '0x0000000000000000000000000000000000000000000000000000000000000012',
      }),
      ['Content-Type', 'application/json'],
    )
    .post('/', {
      method: 'eth_call',
      params: [
        {
          to: '0x74a07a137e347590b7d6fa63b70c2c331af94a8b',
          data: '0xdab09d9f1893e362eeaefe364facfb30daa986746b65eb67010000000000000000000000',
        },
        'latest',
      ],
      id: /^\d+$/,
      jsonrpc: '2.0',
    })
    .reply(
      200,
      (_, request: JsonRpcPayload) => ({
        jsonrpc: '2.0',
        id: request['id'],
        result: '0x0000000000000000000000000000000000000000000000000000000000000006',
      }),
      ['Content-Type', 'application/json'],
    )
}
