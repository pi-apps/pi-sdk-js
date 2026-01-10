export type PiEnv = 'production' | 'sandbox' | 'mock'

export interface PiUser {
  uid: string
  username: string
  roles?: string[]
}

export type PaymentStatus =
  | 'CREATED'
  | 'APPROVED'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'
  | 'EXPIRED'

export interface PaymentData {
  amount: number
  memo: string
  metadata?: Record<string, any>
}

export interface SplitRule {
  merchantId: string
  amount: number
}

export interface MarketplacePayment extends PaymentData {
  splits?: SplitRule[]
  escrow?: boolean
}

export interface Merchant {
  merchantId: string
  wallet: string
  feePercent?: number
}
