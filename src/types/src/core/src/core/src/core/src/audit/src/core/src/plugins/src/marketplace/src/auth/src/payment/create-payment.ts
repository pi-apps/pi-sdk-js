import { MarketplacePayment } from '../types'
import { PaymentEngine } from '../core/payment-engine'

declare global {
  interface Window {
    Pi: any
  }
}

export function createPayment(
  data: MarketplacePayment,
  engine: PaymentEngine
) {
  engine.transition('CREATED', data)

  window.Pi.createPayment(
    {
      amount: data.amount,
      memo: data.memo,
      metadata: data.metadata
    },
    {
      onReadyForServerApproval: (paymentId: string) =>
        engine.transition('APPROVED', { paymentId }),

      onReadyForServerCompletion: (paymentId: string) =>
        engine.transition('SUBMITTED', { paymentId }),

      onCancel: (paymentId: string) =>
        engine.transition('CANCELLED', { paymentId }),

      onError: (error: any, payment?: any) =>
        engine.transition('FAILED', { error, payment })
    }
  )
}
