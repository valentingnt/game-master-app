import { useMemo, useState } from "react"
import {
  useMessages,
  usePlayers,
  useToggleMessageVisibility,
} from "../lib/hooks"
import SendMessageModal from "./SendMessageModal"

export default function MessageHistory({
  showTitle = true,
}: { showTitle?: boolean } = {}) {
  const { data: messages } = useMessages()
  const { data: players } = usePlayers()
  const toggle = useToggleMessageVisibility()
  const [open, setOpen] = useState(false)

  const playerMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of players ?? []) map[p.id] = `${p.first_name} ${p.last_name}`
    return map
  }, [players])

  return (
    <div className="card-surface p-4">
      <div className="flex items-center justify-between mb-3">
        {showTitle && <div className="display-title text-base">Messages</div>}
        {!showTitle && <div />}
        <button className="btn" onClick={() => setOpen(true)}>
          Nouveau
        </button>
      </div>
      <div className="space-y-2 max-h-64 overflow-auto">
        {(messages ?? []).map((m) => (
          <div
            key={m.id}
            className="flex items-start justify-between gap-3 text-sm"
          >
            <div className="flex-1">
              <div className="muted whitespace-pre-wrap">{m.content}</div>
              <div className="text-xs text-gray-500 mt-1">
                Joueur:{" "}
                {m.target_player_id
                  ? playerMap[m.target_player_id] || "Unknown"
                  : "All"}
              </div>
            </div>
            <label className="flex items-center gap-2 shrink-0">
              <input
                type="checkbox"
                checked={m.show}
                onChange={(e) =>
                  toggle.mutate({ id: m.id, show: e.target.checked })
                }
              />
              Afficher
            </label>
          </div>
        ))}
        {(!messages || messages.length === 0) && (
          <div className="text-sm muted">Aucun message.</div>
        )}
      </div>
      {open && <SendMessageModal open={open} onClose={() => setOpen(false)} />}
    </div>
  )
}
