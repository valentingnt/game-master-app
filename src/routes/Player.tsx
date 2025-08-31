import { useEffect, useMemo } from "react"
import { useParams } from "react-router-dom"
import { useMessages, usePlayers } from "../lib/hooks"

export default function Player() {
  const params = useParams()
  const playerId = params.id as string
  const { data: players } = usePlayers()

  const player = useMemo(
    () => (players ?? []).find((p) => p.id === playerId) ?? null,
    [players, playerId]
  )

  useEffect(() => {
    if (playerId) {
      try {
        localStorage.setItem("last_player_id", playerId)
      } catch {}
    }
  }, [playerId])

  const { data: messages } = useMessages()
  const activeMessage = useMemo(() => {
    const list = (messages ?? []).filter(
      (m) =>
        m.show &&
        (m.target_player_id === playerId || m.target_player_id == null)
    )
    list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    return list[0] ?? null
  }, [messages, playerId])

  return (
    <div className="space-y-6">
      {activeMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="max-w-4xl px-6 text-center">
            <div className="text-white font-mono tracking-widest text-3xl sm:text-5xl md:text-6xl leading-snug">
              {activeMessage.content}
            </div>
          </div>
        </div>
      )}
      <section className="rounded border border-gray-800 p-4 bg-gray-900">
        <div className="font-semibold mb-3">Your Character</div>
        {!player ? (
          <div className="text-sm text-gray-400">Player not found.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {player.avatar_url ? (
                <img
                  src={player.avatar_url}
                  alt={`${player.first_name} ${player.last_name}`}
                  className={`w-16 h-16 rounded object-cover ${
                    player.is_dead ? "grayscale" : ""
                  }`}
                />
              ) : (
                <div
                  className={`w-16 h-16 rounded bg-gray-700 ${
                    player.is_dead ? "grayscale" : ""
                  }`}
                />
              )}
              <div className="flex-1">
                <div className="font-semibold text-lg">
                  {player.first_name} {player.last_name}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Orientation {player.orientation} • Strength {player.strength}{" "}
                  • Resistance {player.resistance}
                </div>
              </div>
              {player.is_dead && (
                <div className="text-red-400 text-sm font-semibold">DEAD</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-400">HP</div>
                <div>
                  {Math.min(player.hp_current, player.hp_max)} / {player.hp_max}
                </div>
              </div>
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-400">Action</div>
                <div>{player.action_points} / 2</div>
              </div>
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-400">Fatigue</div>
                <div>{player.fatigue}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-400">Hunger</div>
                <div>{player.hunger}</div>
              </div>
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-400">Thirst</div>
                <div>{player.thirst}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-gray-400 text-sm mb-2">Core Stats</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {[
                  { key: "orientation", label: "Orientation" },
                  { key: "strength", label: "Strength" },
                  { key: "resistance", label: "Resistance" },
                  { key: "charisma", label: "Charisma" },
                  { key: "agility", label: "Agility" },
                  { key: "dexterity", label: "Dexterity" },
                  { key: "intuition", label: "Intuition" },
                ].map((s) => (
                  <div key={s.key} className="bg-gray-800 rounded p-2">
                    <div className="text-gray-400">{s.label}</div>
                    <div>{(player as any)[s.key] as number}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {player && (
        <section className="rounded border border-gray-800 p-4 bg-gray-900">
          <div className="text-gray-400 text-sm mb-2">
            Additional Information
          </div>
          <div className="space-y-3 text-sm">
            {player.history && (
              <div>
                <div className="text-gray-400">History</div>
                <div className="whitespace-pre-wrap">{player.history}</div>
              </div>
            )}
            {player.physical_description && (
              <div>
                <div className="text-gray-400">Physical Description</div>
                <div className="whitespace-pre-wrap">
                  {player.physical_description}
                </div>
              </div>
            )}
            {player.character_traits && (
              <div>
                <div className="text-gray-400">Character Traits</div>
                <div className="whitespace-pre-wrap">
                  {player.character_traits}
                </div>
              </div>
            )}
            {player.age && (
              <div>
                <div className="text-gray-400">Age</div>
                <div>{player.age}</div>
              </div>
            )}
            {player.size && (
              <div>
                <div className="text-gray-400">Size</div>
                <div>{player.size}</div>
              </div>
            )}
            {player.weight && (
              <div>
                <div className="text-gray-400">Weight</div>
                <div>{player.weight}</div>
              </div>
            )}
            {player.sex && (
              <div>
                <div className="text-gray-400">Sex</div>
                <div>{player.sex}</div>
              </div>
            )}
            {player.astrological_sign && (
              <div>
                <div className="text-gray-400">Astrological Sign</div>
                <div>{player.astrological_sign}</div>
              </div>
            )}
            {!player.history &&
              !player.physical_description &&
              !player.character_traits &&
              !player.age &&
              !player.size &&
              !player.weight &&
              !player.sex &&
              !player.astrological_sign && (
                <div className="text-gray-500">No additional information</div>
              )}
          </div>
        </section>
      )}
    </div>
  )
}
