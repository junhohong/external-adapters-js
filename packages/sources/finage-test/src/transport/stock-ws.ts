import { WebSocketTransport } from '@chainlink/external-adapter-framework/transports/websocket'
import { EquitiesEndpointTypes } from '../endpoint/utils'

interface Message {
  s: string
  a: string
  p: string
  b: string
  t: number
}

type WsTransportTypes = EquitiesEndpointTypes & {
  Provider: {
    WsMessage: Message
  }
}

export const wsTransport = new WebSocketTransport<WsTransportTypes>({
  url: (context) => {
    return `${context.adapterSettings.STOCK_WS_API_ENDPOINT}/?token=${context.adapterSettings.WS_SOCKET_KEY}`
  },
  handlers: {
    message(message) {
      if (!message.p && !message.a && !message.b) {
        return []
      }

      let result
      if (message.p) {
        result = Number(message.p)
      } else {
        result = (Number(message.a) + Number(message.b)) / 2
      }

      return [
        {
          params: { base: message.s },
          response: {
            data: {
              result,
            },
            result,
            timestamps: {
              providerIndicatedTimeUnixMs: message.t,
            },
          },
        },
      ]
    },
  },

  builders: {
    subscribeMessage: (params) => {
      return { action: 'subscribe', symbols: `${params.base}`.toUpperCase() }
    },
    unsubscribeMessage: (params) => {
      return { action: 'unsubscribe', symbols: `${params.base}`.toUpperCase() }
    },
  },
})
