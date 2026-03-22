import { Merchant } from '../types'

export class MerchantRegistry {
  private merchants = new Map<string, Merchant>()

  register(merchant: Merchant) {
    this.merchants.set(merchant.merchantId, merchant)
  }

  get(id: string) {
    return this.merchants.get(id)
  }
}
