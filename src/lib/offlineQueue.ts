type QueuedMutation = {
  key: string
  payload: unknown
  run?: () => Promise<void>
}

const queue: QueuedMutation[] = []
let isOnline = true

const STORAGE_KEY = "gm_offline_queue"
type PersistedEntry = { key: string; payload: unknown }

type Handler = (payload: unknown) => Promise<void>
const handlerRegistry: Record<string, Handler> = {}

export function registerHandler(key: string, handler: Handler) {
  handlerRegistry[key] = handler
}

function persistQueue() {
  try {
    const data: PersistedEntry[] = queue.map(({ key, payload }) => ({
      key,
      payload,
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

function rehydrateQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as PersistedEntry[]
    for (const e of data) {
      if (
        !queue.find(
          (q) =>
            q.key === e.key &&
            JSON.stringify(q.payload) === JSON.stringify(e.payload)
        )
      ) {
        queue.push({ key: e.key, payload: e.payload })
      }
    }
  } catch {}
}

rehydrateQueue()

export function setOnlineState(online: boolean) {
  isOnline = online
  if (isOnline) {
    void flush()
  }
}

export async function enqueue(m: QueuedMutation) {
  queue.push(m)
  persistQueue()
}

export async function flush() {
  while (queue.length > 0 && isOnline) {
    const m = queue.shift()!
    try {
      if (m.run) {
        await m.run()
      } else if (handlerRegistry[m.key]) {
        await handlerRegistry?.[m.key]?.(m.payload)
      } else {
        // No handler registered; put back and stop
        queue.unshift(m)
        break
      }
    } catch {
      // Put it back to retry later
      queue.unshift(m)
      break
    }
    persistQueue()
  }
}
