import { PiSdk } from '../sdk'

export interface PiSdkPlugin {
  name: string
  onInit?(sdk: PiSdk): void
  onPaymentEvent?(event: string, payload: any): void
}
