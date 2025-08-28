import type { Player } from "../lib/types"
import { useUpdatePlayerField } from "../lib/hooks"

type Props = { player: Player }

export default function PlayerCard({ player: p }: Props) {
  const update = useUpdatePlayerField()

  return (
    <div className="rounded border border-gray-800 p-4 bg-gray-900 w-full">
      <div className="flex items-center gap-3">
        {p.avatar_url ? (
          <img
            src={p.avatar_url}
            alt={`${p.first_name} ${p.last_name}`}
            className={`w-14 h-14 rounded object-cover ${
              p.is_dead ? "grayscale" : ""
            }`}
          />
        ) : (
          <div
            className={`w-14 h-14 rounded bg-gray-700 ${
              p.is_dead ? "grayscale" : ""
            }`}
          />
        )}
        <div className="flex-1">
          <div className="font-semibold grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              className="bg-gray-800 rounded px-2 py-1 w-full"
              value={p.first_name}
              onChange={(e) =>
                update.mutate({
                  id: p.id,
                  field: "first_name",
                  value: e.target.value,
                })
              }
            />
            <input
              className="bg-gray-800 rounded px-2 py-1 w-full"
              value={p.last_name}
              onChange={(e) =>
                update.mutate({
                  id: p.id,
                  field: "last_name",
                  value: e.target.value,
                })
              }
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">{`Orientation ${p.orientation} • Strength ${p.strength} • Resistance ${p.resistance}`}</div>
        </div>
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={p.is_dead}
            onChange={(e) =>
              update.mutate({
                id: p.id,
                field: "is_dead",
                value: e.target.checked,
              })
            }
          />
          Dead
        </label>
      </div>

      <div className="mt-3">
        <label className="text-xs text-gray-400">Avatar URL</label>
        <input
          className="mt-1 w-full bg-gray-800 rounded px-2 py-1"
          value={p.avatar_url ?? ""}
          onChange={(e) =>
            update.mutate({
              id: p.id,
              field: "avatar_url",
              value: e.target.value,
            })
          }
          placeholder="https://..."
        />
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="bg-gray-800 rounded p-2">
          <div className="text-gray-400">HP</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="w-24 bg-gray-900 rounded px-1"
              value={Math.min(p.hp_current, p.hp_max)}
              onChange={(e) => {
                const raw = Number(e.target.value || 0)
                const clamped = Math.min(raw, p.hp_max)
                update.mutate({ id: p.id, field: "hp_current", value: clamped })
                if (clamped <= 0) {
                  update.mutate({ id: p.id, field: "is_dead", value: true })
                }
              }}
            />
            <span>/</span>
            <input
              type="number"
              className="w-24 bg-gray-900 rounded px-1"
              value={p.hp_max}
              onChange={(e) => {
                const nextMax = Number(e.target.value || 0)
                update.mutate({ id: p.id, field: "hp_max", value: nextMax })
                if (p.hp_current > nextMax) {
                  update.mutate({
                    id: p.id,
                    field: "hp_current",
                    value: nextMax,
                  })
                  if (nextMax <= 0) {
                    update.mutate({ id: p.id, field: "is_dead", value: true })
                  }
                }
              }}
            />
          </div>
        </div>
        <div className="bg-gray-800 rounded p-2">
          <div className="text-gray-400">Action</div>
          <input
            type="number"
            className="w-24 bg-gray-900 rounded px-1"
            value={p.action_points}
            onChange={(e) =>
              update.mutate({
                id: p.id,
                field: "action_points",
                value: Number(e.target.value || 0),
              })
            }
          />
        </div>
        <div className="bg-gray-800 rounded p-2">
          <div className="text-gray-400">Fatigue</div>
          <input
            type="number"
            className="w-24 bg-gray-900 rounded px-1"
            value={p.fatigue}
            onChange={(e) =>
              update.mutate({
                id: p.id,
                field: "fatigue",
                value: Number(e.target.value || 0),
              })
            }
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="bg-gray-800 rounded p-2">
          <div className="text-gray-400">Hunger</div>
          <input
            type="number"
            className="w-24 bg-gray-900 rounded px-1"
            value={p.hunger}
            onChange={(e) =>
              update.mutate({
                id: p.id,
                field: "hunger",
                value: Number(e.target.value || 0),
              })
            }
          />
        </div>
        <div className="bg-gray-800 rounded p-2">
          <div className="text-gray-400">Thirst</div>
          <input
            type="number"
            className="w-24 bg-gray-900 rounded px-1"
            value={p.thirst}
            onChange={(e) =>
              update.mutate({
                id: p.id,
                field: "thirst",
                value: Number(e.target.value || 0),
              })
            }
          />
        </div>
        <div className="bg-gray-800 rounded p-2">
          <div className="text-gray-400">AP Reset</div>
          <button
            className="px-2 py-1 bg-blue-600 rounded"
            onClick={() =>
              update.mutate({ id: p.id, field: "action_points", value: 2 })
            }
          >
            Set 2
          </button>
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
              <input
                type="number"
                className="w-24 bg-gray-900 rounded px-1"
                value={(p as any)[s.key] as number}
                onChange={(e) =>
                  update.mutate({
                    id: p.id,
                    field: s.key as any,
                    value: Number(e.target.value || 0),
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
