import { useState, useEffect } from "react"
import { useAppState, useUpdateTokens } from "../lib/hooks"

export default function TokenCounter() {
  const { data } = useAppState()
  const [tokens, setTokens] = useState<number>(data?.tokens ?? 0)
  const updateTokens = useUpdateTokens()

  useEffect(() => {
    if (typeof data?.tokens === "number") setTokens(data.tokens)
  }, [data?.tokens])

  return (
    <div className="rounded border border-gray-800 p-4 bg-gray-900">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Tokens</div>
        <div className="text-2xl">{tokens}</div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          className="px-3 py-1.5 rounded bg-gray-800"
          onClick={() => {
            const next = Math.max(0, tokens - 1)
            setTokens(next)
            updateTokens.mutate(next)
          }}
        >
          -
        </button>
        <button
          className="px-3 py-1.5 rounded bg-gray-800"
          onClick={() => {
            const next = tokens + 1
            setTokens(next)
            updateTokens.mutate(next)
          }}
        >
          +
        </button>
      </div>
    </div>
  )
}
