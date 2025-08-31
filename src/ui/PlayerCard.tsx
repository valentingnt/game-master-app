import type { Player } from "../lib/types"
import {
  useUpdatePlayerField,
  useUploadPlayerAvatar,
  useClearPlayerAvatar,
} from "../lib/hooks"
import { supabase } from "../lib/supabaseClient"
import { useToast } from "./Toast"

type Props = { player: Player }

export default function PlayerCard({ player: p }: Props) {
  const update = useUpdatePlayerField()
  const { show } = useToast()
  const upload = useUploadPlayerAvatar()
  const clearAvatar = useClearPlayerAvatar()

  const normalizeAvatarUrl = (url: string | null | undefined): string => {
    const raw = (url ?? "").trim()
    if (!raw) return ""
    if (raw.startsWith("pp/")) {
      const path = raw.replace(/^pp\//, "")
      const { data } = supabase.storage.from("pp").getPublicUrl(path)
      return (data as any)?.publicUrl || raw
    }
    if (raw.includes("/storage/v1/object/pp/")) {
      return raw.replace(
        "/storage/v1/object/pp/",
        "/storage/v1/object/public/pp/"
      )
    }
    return raw
  }

  async function resizeImageFile(
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number
  ): Promise<File> {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error("Failed to load image"))
      i.src = dataUrl
    })

    const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1)
    const targetW = Math.round(img.width * ratio)
    const targetH = Math.round(img.height * ratio)

    const canvas = document.createElement("canvas")
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext("2d")!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(img, 0, 0, targetW, targetH)

    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob(
        (b) => resolve(b || new Blob()),
        "image/webp",
        Math.max(0.5, Math.min(quality, 0.95))
      )
    )
    const ext = "webp"
    const nameBase = file.name.replace(/\.[^.]+$/, "") || "avatar"
    return new File([blob], `${nameBase}.${ext}`, { type: "image/webp" })
  }

  const copyLink = async () => {
    try {
      const url = `${window.location.origin}/player/${p.id}`
      await navigator.clipboard.writeText(url)
      show({ type: "success", message: "Player link copied" })
    } catch (_e) {
      show({ type: "error", message: "Failed to copy link" })
    }
  }

  return (
    <div className="rounded border border-gray-800 p-4 bg-gray-900 w-full">
      <div className="flex items-center gap-3">
        {normalizeAvatarUrl(p.avatar_url) ? (
          <img
            src={normalizeAvatarUrl(p.avatar_url)}
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
        <button
          className="ml-2 px-2 py-1 rounded bg-gray-800 text-xs"
          onClick={copyLink}
        >
          Copy Link
        </button>
      </div>

      <div className="mt-3">
        <label className="text-xs text-gray-400">Avatar URL</label>
        <div className="mt-1 flex items-center gap-2">
          <input
            className="flex-1 bg-gray-800 rounded px-2 py-1"
            value={p.avatar_url ?? ""}
            onChange={(e) =>
              update.mutate({
                id: p.id,
                field: "avatar_url",
                value: e.target.value,
              })
            }
            onBlur={(e) => {
              const next = normalizeAvatarUrl(e.target.value)
              if (next && next !== e.target.value) {
                update.mutate({ id: p.id, field: "avatar_url", value: next })
              }
            }}
            placeholder="https://..."
          />
          <label className="px-2 py-1 rounded bg-gray-800 cursor-pointer text-xs">
            Upload
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const inputEl = e.currentTarget as HTMLInputElement
                const file = inputEl.files?.[0]
                if (!file) return
                // Clear immediately to avoid accessing pooled event later
                inputEl.value = ""
                try {
                  const resized = await resizeImageFile(file, 512, 512, 0.85)
                  upload.mutate(
                    { id: p.id, file: resized, previousUrl: p.avatar_url },
                    {
                      onSuccess: () =>
                        show({ type: "success", message: "Avatar uploaded" }),
                      onError: () =>
                        show({ type: "error", message: "Upload failed" }),
                    }
                  )
                } catch (_e) {
                  show({ type: "error", message: "Image processing failed" })
                }
              }}
            />
          </label>
          {p.avatar_url && (
            <button
              className="px-2 py-1 rounded bg-gray-800 text-xs"
              onClick={() => {
                clearAvatar.mutate(
                  { id: p.id, url: p.avatar_url },
                  {
                    onSuccess: () =>
                      show({ type: "success", message: "Avatar cleared" }),
                    onError: () =>
                      show({ type: "error", message: "Failed to clear" }),
                  }
                )
              }}
            >
              Clear
            </button>
          )}
        </div>
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
          <div className="flex items-center gap-2">
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
            <span className="text-xs text-gray-400">/ 2</span>
          </div>
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
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="w-24 bg-gray-900 rounded px-1"
              value={p.hunger}
              onChange={(e) => {
                const val = Number(e.target.value || 0)
                const clamped = Math.max(-2, Math.min(2, val))
                update.mutate({ id: p.id, field: "hunger", value: clamped })
              }}
            />
            <button
              className="px-2 py-1 bg-gray-700 rounded text-xs"
              onClick={() =>
                update.mutate({
                  id: p.id,
                  field: "hunger",
                  value: Math.max(-2, Math.min(2, p.hunger + 1)),
                })
              }
            >
              +1
            </button>
            <button
              className="px-2 py-1 bg-gray-700 rounded text-xs"
              onClick={() =>
                update.mutate({
                  id: p.id,
                  field: "hunger",
                  value: Math.max(-2, Math.min(2, p.hunger - 1)),
                })
              }
            >
              -1
            </button>
          </div>
        </div>
        <div className="bg-gray-800 rounded p-2">
          <div className="text-gray-400">Thirst</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="w-24 bg-gray-900 rounded px-1"
              value={p.thirst}
              onChange={(e) => {
                const val = Number(e.target.value || 0)
                const clamped = Math.max(-2, Math.min(2, val))
                update.mutate({ id: p.id, field: "thirst", value: clamped })
              }}
            />
            <button
              className="px-2 py-1 bg-gray-700 rounded text-xs"
              onClick={() =>
                update.mutate({
                  id: p.id,
                  field: "thirst",
                  value: Math.max(-2, Math.min(2, p.thirst + 1)),
                })
              }
            >
              +1
            </button>
            <button
              className="px-2 py-1 bg-gray-700 rounded text-xs"
              onClick={() =>
                update.mutate({
                  id: p.id,
                  field: "thirst",
                  value: Math.max(-2, Math.min(2, p.thirst - 1)),
                })
              }
            >
              -1
            </button>
          </div>
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
