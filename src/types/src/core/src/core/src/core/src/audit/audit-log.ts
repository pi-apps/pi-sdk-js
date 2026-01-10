import { PaymentStatus } from '../types'

export interface AuditLog {
  paymentId: string
  status: PaymentStatus
  timestamp: number
  payload?: any
}
