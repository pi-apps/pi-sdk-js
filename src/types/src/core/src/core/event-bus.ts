export type EventHandler = (payload?: any) => void

export class EventBus {
  private listeners = new Map<string, EventHandler[]>()

  on(event: string, handler: EventHandler) {
    const list = this.listeners.get(event) || []
    list.push(handler)
    this.listeners.set(event, list)
  }

  emit(event: string, payload?: any) {
    this.listeners.get(event)?.forEach(h => h(payload))
  }
}
