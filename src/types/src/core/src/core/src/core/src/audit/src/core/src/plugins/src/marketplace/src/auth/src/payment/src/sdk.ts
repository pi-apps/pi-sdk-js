import { PiSdkConfig, defaultConfig } from './core/config'
import { EventBus } from './core/event-bus'
import { PaymentEngine } from './core/payment-engine'
import { MerchantRegistry } from './marketplace/merchant'
import { PiSdkPlugin } from './plugins/plugin'
import { MarketplacePayment, PiUser } from './types'
import { connectPi } from './auth/connect'
import { createPayment } from './payment/create-payment'

export class PiSdk {
  static user: PiUser | null = null

  private events = new EventBus()
  private engine: PaymentEngine
  private merchants = new MerchantRegistry()
  private plugins: PiSdkPlugin[] = []
  private config: PiSdkConfig

  constructor(config?: PiSdkConfig) {
    this.config = { ...defaultConfig, ...config }
    this.engine = new PaymentEngine(this.events, this.config.debug)
  }

  async connect() {
    PiSdk.user = await connectPi(this.config.env!)
    this.events.emit('user:connected', PiSdk.user)
    return PiSdk.user
  }

  on(event: string, handler: any) {
    this.events.on(event, handler)
  }

  use(plugin: PiSdkPlugin) {
    plugin.onInit?.(this)
    this.plugins.push(plugin)
  }

  registerMerchant(m: any) {
    this.merchants.register(m)
  }

  pay(data: MarketplacePayment) {
    createPayment(data, this.engine)
  }

  audit() {
    return this.engine.getAuditTrail()
  }
}
