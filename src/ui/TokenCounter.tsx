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
    <div className="card-surface p-4">
      <div className="flex items-center justify-between">
        <div className="display-title text-base">Tokens</div>
        <div className="text-2xl">{tokens}</div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          className="btn"
          onClick={() => {
            const next = Math.max(0, tokens - 1)
            setTokens(next)
            updateTokens.mutate(next)
          }}
        >
          -
        </button>
        <button
          className="btn"
          onClick={() => {
            const next = tokens + 1
            setTokens(next)
            updateTokens.mutate(next)
          }}
        >
          +
        </button>
        <button
          className="btn"
          onClick={() => {
            setDraftTokens(tokens)
            setEditOpen(true)
          }}
        >
          Modifier
        </button>
      </div>
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Modifier les tokens"
      >
        <div className="space-y-3">
          <input
            type="number"
            className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
            value={draftTokens}
            onChange={(e) => setDraftTokens(Number(e.target.value || 0))}
          />
          <div className="flex gap-2 justify-end">
            <button className="btn" onClick={() => setEditOpen(false)}>
              Annuler
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditOpen(false)
                setTokens(draftTokens)
                updateTokens.mutate(draftTokens, {
                  onSuccess: () =>
                    show({ type: "success", message: "Tokens mis à jour" }),
                  onError: () =>
                    show({
                      type: "error",
                      message:
                        "Échec de la mise à jour des tokens (mis en file d'attente si hors ligne)",
                    }),
                })
              }}
            >
              Enregistrer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
