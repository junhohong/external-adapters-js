import { expose } from '@chainlink/external-adapter-framework'
import {
  Adapter,
  AdapterEndpoint,
  AdapterParams,
  EndpointContext,
} from '@chainlink/external-adapter-framework/adapter'
import {
  EmptyCustomSettings,
  SettingsDefinitionMap,
} from '@chainlink/external-adapter-framework/config'
import { SingleNumberResultResponse, sleep } from '@chainlink/external-adapter-framework/util'
import { InputParameters } from '@chainlink/external-adapter-framework/validation'
import { AddressInfo } from 'net'
import request from 'supertest'
import { CompositeHttpTransport } from '../../src/transports/composite-http'
import nock from 'nock'

const inputParameters = new InputParameters({
  input: {
    description: 'Input to be returned',
    type: 'number',
    required: true,
  },
})

const mockDataProviderUrl = 'http://localhost:5000'

type CompositeHttpTransportTypes = {
  Parameters: typeof inputParameters.definition
  Response: SingleNumberResultResponse
  Settings: EmptyCustomSettings
}

class MockCompositeHttpTransport extends CompositeHttpTransport<CompositeHttpTransportTypes> {
  backgroundExecuteCalls = 0

  constructor() {
    super({
      performRequest: async (params, _adapterSettings, requestHandler) => {
        const result = await requestHandler<number>({
          url: mockDataProviderUrl,
          method: 'POST',
          data: {
            input: params.input,
          },
        }).then((res) => res.data)

        return {
          params: params,
          response: {
            data: {
              result: result,
            },
            result: result,
            timestamps: {
              providerDataRequestedUnixMs: Date.now(),
              providerDataReceivedUnixMs: Date.now(),
              providerIndicatedTimeUnixMs: undefined,
            },
          },
        }
      },
    })
  }

  override async backgroundExecute(
    context: EndpointContext<CompositeHttpTransportTypes>,
  ): Promise<void> {
    const entries = await this.subscriptionSet.getAll()
    if (entries.length) {
      this.backgroundExecuteCalls++
    }
    return super.backgroundExecute(context)
  }
}

const createAndExposeAdapter = async (
  params: Partial<AdapterParams<SettingsDefinitionMap>> = {},
) => {
  // Disable retries to make the testing flow easier
  process.env['CACHE_POLLING_MAX_RETRIES'] = '0'
  process.env['RETRY'] = '0'
  process.env['BACKGROUND_EXECUTE_MS_HTTP'] = '1000'

  nock(mockDataProviderUrl, { encodedQueryParams: true })
    .persist()
    .post('/')
    .reply(200, (_, request) => (request as any)['input'], [])

  const transport = new MockCompositeHttpTransport()
  const adapter = new Adapter({
    name: 'TEST',
    defaultEndpoint: 'test',
    endpoints: [
      new AdapterEndpoint({
        name: 'test',
        inputParameters,
        transport,
      }),
    ],
    ...params,
  })

  const fastify = await expose(adapter)
  const req = request(`http://localhost:${(fastify?.server.address() as AddressInfo).port}`)
  return { transport, adapter, fastify, req }
}

describe('composite-http transport', () => {
  test('returns data fetched by background execute', async () => {
    const { fastify, req } = await createAndExposeAdapter()

    // Send initial request to start background execute
    await req.post('/').send({ data: { input: 1 } })
    await sleep(1000)

    const { statusCode, data, result } = await req
      .post('/')
      .send({ data: { input: 1 } })
      .then((res) => res.body)

    expect(statusCode).toBe(200)
    expect(data.result).toBe(1)
    expect(result).toBe(1)

    await fastify?.close()
    nock.restore()
    nock.cleanAll()
  })

  test('per second rate limit of 1 results in a call every second', async () => {
    const { transport, fastify, req } = await createAndExposeAdapter({
      rateLimiting: {
        tiers: {
          default: {
            rateLimit1s: 1,
          },
        },
      },
    })

    const rateLimiter = transport.requester['rateLimiter']

    console.log(`Date.now: ${Date.now()}`)
    console.log(
      `msUntilNextExecution: ${rateLimiter.msUntilNextExecution()}, ${rateLimiter.period}, ${
        rateLimiter.lastRequestAt
      }`,
    )

    // Send initial request to start background execute
    await req.post('/').send({ data: { input: 1 } })

    await sleep(3000)

    expect(transport.backgroundExecuteCalls).toBe(3)

    await fastify?.close()
    nock.restore()
    nock.cleanAll()
  })
})

/**
 * To Test
 *
 * -- Subscription --
 * Requests are added to the subscription set
 *    subscription.registerRequest
 *    adapter.handleRequest
 *    router.route
 *
 *
 * Background execute fetches data based on subscription set
 *    subscription.backgroundExecute
 *    callBackgroundExecutes
 *    start
 *
 *
 * -- Composite HTTP --
 * Background handler fetches data for subscription set
 *    compositeHttp.makeRequest
 *    compositeHttp.handleRequest
 *    compositeHttp.backgroundHandler
 *    subscription.backgroundExecute
 *
 */

/**
 * subscription.backgroundExecute
 * compositeHttp.backgroundHandler
 * compositeHttp.handleRequest
 * compositeHttp.makeRequest
 * endpoint.performRequest(requestHandler)
 */
