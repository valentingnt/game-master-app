import { useMemo, useState } from "react"
import Modal from "./Modal"
import { usePlayers, useSendMessages } from "../lib/hooks"

type Props = {
  open: boolean
  onClose: () => void
}

export default function SendMessageModal({ open, onClose }: Props) {
  const { data: players } = usePlayers()
  const send = useSendMessages()
  const [content, setContent] = useState("")
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [toAll, setToAll] = useState(true)

  const allPlayerIds = useMemo(
    () => (players ?? []).map((p) => p.id),
    [players]
  )

  const toggle = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const submit = async () => {
    const ids = toAll
      ? [null]
      : Object.entries(selected)
          .filter(([, v]) => v)
          .map(([k]) => k)
    if (ids.length === 0) return
    await send.mutateAsync({ content: content.trim(), targetIds: ids })
    setContent("")
    setSelected({})
    setToAll(true)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Envoyer un message">
      <div className="space-y-4 text-white">
        <div className="text-xs uppercase tracking-wider muted">Contenu</div>
        <textarea
          className="w-full min-h-[120px] bg-white/10 border border-white/10 rounded px-3 py-2 outline-none"
          placeholder="Tapez votre message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider muted">
            Destinataires
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={toAll}
              onChange={(e) => setToAll(e.target.checked)}
            />
            Envoyer à tous les joueurs
          </label>
          {!toAll && (
            <div className="max-h-48 overflow-auto rounded border border-white/10 p-2">
              <div className="flex flex-wrap gap-2 text-sm">
                {(players ?? []).map((p) => (
                  <label key={p.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!selected[p.id]}
                      onChange={() => toggle(p.id)}
                    />
                    {p.first_name} {p.last_name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn btn-primary disabled:opacity-50"
            disabled={content.trim().length === 0}
            onClick={submit}
          >
            Envoyer
          </button>
        </div>
      </div>
    </Modal>
  )
}
