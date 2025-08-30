import { useState, useEffect } from "react"
import { useAppState, useUpdateTokens } from "../lib/hooks"
import Modal from "./Modal"
import { useToast } from "./Toast"

export default function TokenCounter() {
  const { data } = useAppState()
  const [tokens, setTokens] = useState<number>(data?.tokens ?? 0)
  const updateTokens = useUpdateTokens()
  const [editOpen, setEditOpen] = useState(false)
  const [draftTokens, setDraftTokens] = useState<number>(tokens)
  const { show } = useToast()

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
        <button
          className="px-3 py-1.5 rounded bg-gray-800"
          onClick={() => {
            setDraftTokens(tokens)
            setEditOpen(true)
          }}
        >
          Edit
        </button>
      </div>
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Tokens"
      >
        <div className="space-y-3">
          <input
            type="number"
            className="w-full bg-gray-800 rounded px-2 py-1"
            value={draftTokens}
            onChange={(e) => setDraftTokens(Number(e.target.value || 0))}
          />
          <div className="flex gap-2 justify-end">
            <button
              className="px-3 py-1.5 rounded bg-gray-800"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1.5 rounded bg-blue-600"
              onClick={() => {
                setEditOpen(false)
                setTokens(draftTokens)
                updateTokens.mutate(draftTokens, {
                  onSuccess: () =>
                    show({ type: "success", message: "Tokens updated" }),
                  onError: () =>
                    show({
                      type: "error",
                      message: "Failed to update tokens (queued if offline)",
                    }),
                })
              }}
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
