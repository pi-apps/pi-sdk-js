import { PaymentStatus } from '../types'
import { AuditLog } from '../audit/audit-log'
import { EventBus } from './event-bus'

export class PaymentEngine {
  private status: PaymentStatus = 'CREATED'
  private audit: AuditLog[] = []

  constructor(
    private events: EventBus,
    private debug = false
  ) {}

  transition(status: PaymentStatus, payload?: any) {
    this.status = status
    this.audit.push({
      paymentId: payload?.paymentId ?? 'unknown',
      status,
      timestamp: Date.now(),
      payload
    })

    if (this.debug) {
      console.log('[PiSDK][STATE]', status, payload)
    }

    this.events.emit(`payment:${status.toLowerCase()}`, payload)
  }

  getAuditTrail() {
    return this.audit
  }

  getStatus() {
    return this.status
  }
}
