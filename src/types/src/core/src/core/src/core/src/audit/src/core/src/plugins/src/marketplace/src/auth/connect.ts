import { PiUser } from '../types'

declare global {
  interface Window {
    Pi: any
  }
}

export async function connectPi(env: string): Promise<PiUser> {
  if (env === 'mock') {
    return { uid: 'mock', username: 'MockUser' }
  }

  if (!window.Pi) {
    throw new Error('Pi SDK not loaded')
  }

  const auth = await window.Pi.authenticate(
    ['payments', 'username'],
    (err: any) => { if (err) throw err }
  )

  return auth.user
}
