import { useMemo } from "react"
import { useParams, NavLink } from "react-router-dom"
import LEDDisplay from "../ui/LEDDisplay"
import { useAppState, useInventory, usePlayers } from "../lib/hooks"

export default function Player() {
  const params = useParams()
  const playerId = params.id as string
  const { data: app } = useAppState()
  const { data: inv } = useInventory()
  const { data: players } = usePlayers()

  const player = useMemo(
    () => (players ?? []).find((p) => p.id === playerId) ?? null,
    [players, playerId]
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <nav className="flex gap-4">
          <NavLink
            to="/shop1"
            className={({ isActive }) =>
              `px-2 py-1 rounded ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:text-white"
              }`
            }
          >
            Shop 1
          </NavLink>
          <NavLink
            to="/shop2"
            className={({ isActive }) =>
              `px-2 py-1 rounded ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:text-white"
              }`
            }
          >
            Shop 2
          </NavLink>
        </nav>
      </div>

      <section>
        <LEDDisplay size="lg" text={app?.led_main_text ?? ""} variant="main" />
        <div className="grid grid-cols-2 gap-4 mt-3">
          <LEDDisplay size="sm" text={app?.led_small_top ?? ""} variant="top" />
          <LEDDisplay
            size="sm"
            text={app?.led_small_bottom ?? ""}
            variant="bottom"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded border border-gray-800 p-4 bg-gray-900 space-y-3">
          <div className="font-semibold">Day</div>
          <div className="text-2xl">Day {app?.day ?? 0}</div>
          <div className="font-semibold mt-4">Tokens</div>
          <div className="text-2xl">{app?.tokens ?? 0}</div>
        </div>

        <div className="lg:col-span-2 rounded border border-gray-800 p-4 bg-gray-900">
          <div className="font-semibold mb-3">Inventory</div>
          <ul className="space-y-2">
            {(inv ?? []).map((it) => (
              <li key={it.id} className="flex items-center gap-2">
                <div className="flex-1 truncate">{it.item_name}</div>
                <div className="w-16 text-right">{it.quantity}</div>
              </li>
            ))}
            {(!inv || inv.length === 0) && (
              <li className="text-sm text-gray-400">No items</li>
            )}
          </ul>
        </div>
      </section>

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
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-400">AP Reset</div>
                <div className="text-gray-300">Auto resets to 2 each day</div>
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
    </div>
  )
}
