type QueuedMutation = {
  key: string
  payload: unknown
  run: () => Promise<void>
}

const queue: QueuedMutation[] = []
let isOnline = true

export function setOnlineState(online: boolean) {
  isOnline = online
  if (isOnline) {
    void flush()
  }
}

export async function enqueue(m: QueuedMutation) {
  queue.push(m)
}

export async function flush() {
  while (queue.length > 0 && isOnline) {
    const m = queue.shift()!
    try {
      await m.run()
    } catch {
      // Put it back to retry later
      queue.unshift(m)
      break
    }
  }
}
