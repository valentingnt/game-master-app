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
      reader.onerror = () => reject(new Error("Échec de la lecture du fichier"))
      reader.readAsDataURL(file)
    })

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error("Échec de la chargement de l'image"))
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
      show({ type: "success", message: "Lien du joueur copié" })
    } catch (_e) {
      show({ type: "error", message: "Échec de la copie du lien" })
    }
  }

  return (
    <div className="card-surface p-4 w-full">
      <div className="flex items-start sm:items-center gap-3 flex-wrap">
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
        <div className="flex-1 min-w-[170px]">
          <div className="display-title text-base flex flex-wrap gap-2">
            <input
              className="bg-white/10 border border-white/10 rounded px-2 py-1 min-w-[160px] flex-1"
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
              className="bg-white/10 border border-white/10 rounded px-2 py-1 min-w-[160px] flex-1"
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
        </div>
        <label className="text-sm flex items-center gap-2 whitespace-nowrap">
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
          Mort
        </label>
        <button className="ml-2 btn text-xs" onClick={copyLink}>
          Copier le lien
        </button>
      </div>

      <div className="mt-3">
        <label className="text-xs text-white">URL de l'avatar</label>
        <div className="mt-1 flex items-center gap-2">
          <input
            className="flex-1 bg-white/10 border border-white/10 rounded px-2 py-1"
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
          <label className="px-2 py-1 rounded bg-white/10 border border-white/10 cursor-pointer text-xs">
            Uploader
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
                        show({ type: "success", message: "Avatar uploadé" }),
                      onError: () =>
                        show({ type: "error", message: "Échec de l'upload" }),
                    }
                  )
                } catch (_e) {
                  show({
                    type: "error",
                    message: "Échec du traitement de l'image",
                  })
                }
              }}
            />
          </label>
          {p.avatar_url && (
            <button
              className="btn text-xs"
              onClick={() => {
                clearAvatar.mutate(
                  { id: p.id, url: p.avatar_url },
                  {
                    onSuccess: () =>
                      show({ type: "success", message: "Avatar effacé" }),
                    onError: () =>
                      show({ type: "error", message: "Échec de l'effacement" }),
                  }
                )
              }}
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <div className="bg-white/10 border border-white/10 rounded p-2 min-w-[170px] flex-1">
          <div className="text-white">Santé</div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              className="w-16 bg-ink-900 rounded px-1 text-xs sm:text-sm"
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
              className="w-16 bg-ink-900 rounded px-1 text-xs sm:text-sm"
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
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 bg-white/15 border border-white/15 rounded text-xs"
                onClick={() => {
                  const next = p.hp_current + 1
                  const clamped = Math.min(next, p.hp_max)
                  update.mutate({
                    id: p.id,
                    field: "hp_current",
                    value: clamped,
                  })
                  if (clamped <= 0) {
                    update.mutate({ id: p.id, field: "is_dead", value: true })
                  }
                }}
              >
                +1
              </button>
              <button
                className="px-2 py-1 bg-white/15 border border-white/15 rounded text-xs"
                onClick={() => {
                  const next = p.hp_current - 1
                  const clamped = Math.min(next, p.hp_max)
                  update.mutate({
                    id: p.id,
                    field: "hp_current",
                    value: clamped,
                  })
                  if (clamped <= 0) {
                    update.mutate({ id: p.id, field: "is_dead", value: true })
                  }
                }}
              >
                -1
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 bg-white/15 border border-white/15 rounded text-xs"
                onClick={() => {
                  const nextMax = p.hp_max + 1
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
              >
                +1
              </button>
              <button
                className="px-2 py-1 bg-white/15 border border-white/15 rounded text-xs"
                onClick={() => {
                  const nextMax = p.hp_max - 1
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
                  if (nextMax <= 0) {
                    update.mutate({ id: p.id, field: "is_dead", value: true })
                  }
                }}
              >
                -1
              </button>
            </div>
          </div>
        </div>
        <div className="bg-white/10 border border-white/10 rounded p-2 min-w-[170px] flex-1">
          <div className="text-white">Points d'action</div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              className="w-16 bg-ink-900 rounded px-1 text-xs sm:text-sm"
              value={p.action_points}
              onChange={(e) =>
                update.mutate({
                  id: p.id,
                  field: "action_points",
                  value: Number(e.target.value || 0),
                })
              }
            />
            <span className="text-xs text-white">/ 2</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              className="px-2 py-1 bg-white/15 border border-white/15 rounded text-xs"
              onClick={() =>
                update.mutate({
                  id: p.id,
                  field: "action_points",
                  value: (p.action_points ?? 0) + 1,
                })
              }
            >
              +1
            </button>
            <button
              className="px-2 py-1 bg-white/15 border border-white/15 rounded text-xs"
              onClick={() =>
                update.mutate({
                  id: p.id,
                  field: "action_points",
                  value: (p.action_points ?? 0) - 1,
                })
              }
            >
              -1
            </button>
          </div>
        </div>
        <div className="bg-white/10 border border-white/10 rounded p-2 min-w-[170px] flex-1">
          <div className="text-white">Fatigue</div>
          <input
            type="number"
            className="w-16 bg-ink-900 rounded px-1 text-xs sm:text-sm"
            value={p.fatigue}
            onChange={(e) =>
              update.mutate({
                id: p.id,
                field: "fatigue",
                value: Number(e.target.value || 0),
              })
            }
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              className="px-2 py-1 bg-white/15 border border-white/15 rounded text-xs"
              onClick={() =>
                update.mutate({
                  id: p.id,
                  field: "fatigue",
                  value: p.fatigue + 1,
                })
              }
            >
              +1
            </button>
            <button
              className="px-2 py-1 bg-white/15 border border-white/15 rounded text-xs"
              onClick={() =>
                update.mutate({
                  id: p.id,
                  field: "fatigue",
                  value: p.fatigue - 1,
                })
              }
            >
              -1
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <div className="bg-white/10 border border-white/10 rounded p-2 min-w-[170px] flex-1">
          <div className="text-white">Faim</div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              className="w-16 bg-ink-900 rounded px-1 text-xs sm:text-sm"
              value={p.hunger}
              onChange={(e) => {
                const val = Number(e.target.value || 0)
                const clamped = Math.max(-2, Math.min(2, val))
                update.mutate({ id: p.id, field: "hunger", value: clamped })
              }}
            />
            <button
              className="px-2 py-1 bg-white/15 border border-white/15 rounded text-xs"
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
              className="px-2 py-1 bg-white/15 border border-white/15 rounded text-xs"
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
        <div className="bg-white/10 border border-white/10 rounded p-2 min-w-[170px] flex-1">
          <div className="text-white">Soif</div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              className="w-16 bg-ink-900 rounded px-1 text-xs sm:text-sm"
              value={p.thirst}
              onChange={(e) => {
                const val = Number(e.target.value || 0)
                const clamped = Math.max(-2, Math.min(2, val))
                update.mutate({ id: p.id, field: "thirst", value: clamped })
              }}
            />
            <button
              className="px-2 py-1 bg-white/15 border border-white/15 rounded text-xs"
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
              className="px-2 py-1 bg-white/15 border border-white/15 rounded text-xs"
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
      </div>

      <div className="mt-4">
        <div className="text-white text-sm mb-2">Statistiques</div>
        <div className="flex flex-wrap gap-3 text-sm">
          {[
            { key: "orientation", label: "Orientation" },
            { key: "strength", label: "Force" },
            { key: "resistance", label: "Résistance" },
            { key: "charisma", label: "Charisme" },
            { key: "agility", label: "Agilité" },
            { key: "dexterity", label: "Dextérité" },
            { key: "intuition", label: "Intuition" },
          ].map((s) => (
            <div
              key={s.key}
              className="bg-white/10 border border-white/10 rounded p-2 min-w-[200px] flex-1"
            >
              <div className="text-white">{s.label}</div>
              <input
                type="number"
                className="w-16 bg-ink-900 rounded px-1 text-xs sm:text-sm"
                value={(p as any)[s.key] as number}
                onChange={(e) =>
                  update.mutate({
                    id: p.id,
                    field: s.key as any,
                    value: Number(e.target.value || 0),
                  })
                }
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  className="px-2 py-1 bg-white/15 border border-white/15 rounded text-xs"
                  onClick={() =>
                    update.mutate({
                      id: p.id,
                      field: s.key as any,
                      value: ((p as any)[s.key] as number) + 1,
                    })
                  }
                >
                  +1
                </button>
                <button
                  className="px-2 py-1 bg-white/15 border border-white/15 rounded text-xs"
                  onClick={() =>
                    update.mutate({
                      id: p.id,
                      field: s.key as any,
                      value: ((p as any)[s.key] as number) - 1,
                    })
                  }
                >
                  -1
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
