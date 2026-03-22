import { PiEnv } from '../types'

export interface PiSdkConfig {
  env?: PiEnv
  appId?: string
  debug?: boolean
}

export const defaultConfig: PiSdkConfig = {
  env: 'production',
  debug: false
}
