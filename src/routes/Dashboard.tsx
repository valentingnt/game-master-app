import {
  useAppState,
  useUpdateAppStateField,
  useMaskImages,
  useUploadMaskImage,
  useDeleteMaskImage,
  useActivateMask,
} from "../lib/hooks"
import TokenCounter from "../ui/TokenCounter"
import DayController from "../ui/DayController"
import InventoryList from "../ui/InventoryList"
import PlayerCard from "../ui/PlayerCard"
import { usePlayers, useShop, useToggleShopUnlock } from "../lib/hooks"
import ShopItemsModal from "../ui/ShopItemsModal"
import Modal from "../ui/Modal"
import MessageHistory from "../ui/MessageHistory"
import React, { useState, useRef, useEffect } from "react"
import {
  useActiveMaskImage,
  useUpdateMaskPointer,
  useMaskPointer,
} from "../lib/hooks"

export default function Dashboard() {
  const { data: players } = usePlayers()
  const shop1 = useShop("shop1").data
  const shop2 = useShop("shop2").data
  const toggleUnlock = useToggleShopUnlock()
  const [openModal, setOpenModal] = useState<null | "shop1" | "shop2">(null)
  const [openMasks, setOpenMasks] = useState(false)
  const [maskQuery, setMaskQuery] = useState("")
  const app = useAppState().data
  const updateMain = useUpdateAppStateField("led_main_text")
  const updateTop = useUpdateAppStateField("led_small_top")
  const updateBottom = useUpdateAppStateField("led_small_bottom")
  const { data: masks } = useMaskImages()
  const uploadMask = useUploadMaskImage()
  const deleteMask = useDeleteMaskImage()
  const { activate, deactivate } = useActivateMask()
  const activeMaskId = app?.active_mask_id ?? null
  const activeMask = useActiveMaskImage().data
  // Pointer update
  const { mutate: updatePointer } = useUpdateMaskPointer()
  const serverPointer = useMaskPointer().data
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-1 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto lg:min-h-0 pr-1">
          <section>
            <div className="card-surface p-4">
              <div className="muted text-sm mb-1">Panneau principal</div>
              <textarea
                className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 outline-none resize-none"
                rows={3}
                value={app?.led_main_text ?? ""}
                onChange={(e) => updateMain.mutate(e.target.value)}
                placeholder="Panneau principal"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="card-surface p-4">
                <div className="muted text-sm mb-1">
                  Panneau secondaire de gauche
                </div>
                <input
                  className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 outline-none"
                  value={app?.led_small_top ?? ""}
                  onChange={(e) => updateTop.mutate(e.target.value)}
                  placeholder="Écrire..."
                />
              </div>
              <div className="card-surface p-4">
                <div className="muted text-sm mb-1">
                  Panneau secondaire de droite
                </div>
                <input
                  className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 outline-none"
                  value={app?.led_small_bottom ?? ""}
                  onChange={(e) => updateBottom.mutate(e.target.value)}
                  placeholder="Écrire..."
                />
              </div>
            </div>
          </section>
          <section className="card-surface p-4 space-y-3">
            <div className="display-title text-base">Images masque (B/N)</div>
            <div className="flex items-center gap-2">
              <button className="btn" onClick={() => setOpenMasks(true)}>
                Gérer les images
              </button>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const name = prompt("Nom de l'image ?") || f.name
                  uploadMask.mutate({ file: f, name })
                  e.currentTarget.value = ""
                }}
              />
            </div>
          </section>
          <section className="space-y-6">
            <TokenCounter />
            <DayController />
            <div className="card-surface p-4">
              <div className="display-title text-base mb-2">
                Contrôles des boutiques
              </div>
              <div className="space-y-3 text-sm">
                {[
                  { label: "Boutique 1", data: shop1 },
                  { label: "Boutique 2", data: shop2 },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className="w-20 muted">{s.label}</div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!s.data?.shop?.unlocked}
                        onChange={(e) =>
                          s.data?.shop?.id &&
                          toggleUnlock.mutate({
                            id: s.data.shop.id,
                            unlocked: e.target.checked,
                          })
                        }
                      />
                      Déverrouillé
                    </label>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2">
                  <button className="btn" onClick={() => setOpenModal("shop1")}>
                    Gérer les items de la boutique 1
                  </button>
                  <button className="btn" onClick={() => setOpenModal("shop2")}>
                    Gérer les items de la boutique 2
                  </button>
                </div>
              </div>
            </div>
            <InventoryList />
          </section>
        </div>

        <div className="lg:col-span-2 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto lg:min-h-0 pr-1">
          <h2 className="display-title text-lg mb-3">Joueurs</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(players ?? []).map((p) => (
              <PlayerCard key={p.id} player={p} />
            ))}
          </div>
          <div className="mt-6">
            <MessageHistory />
          </div>
        </div>
      </div>
      {/* GM preview canvas (no mask) */}
      <div className="card-surface p-4 mt-6">
        <div className="display-title text-base mb-2">
          Aperçu masque (sans effet)
        </div>
        <PointerPreview
          imageUrl={activeMask?.url || ""}
          pointer={
            serverPointer ? { x: serverPointer.x, y: serverPointer.y } : null
          }
          onCommit={(x, y) => updatePointer({ x, y })}
        />
      </div>
      {openModal && (
        <ShopItemsModal
          shopSlug={openModal}
          open={true}
          onClose={() => setOpenModal(null)}
        />
      )}
      <Modal
        open={openMasks}
        onClose={() => setOpenMasks(false)}
        title="Images masque (B/N)"
      >
        <div className="space-y-3">
          <input
            value={maskQuery}
            onChange={(e) => setMaskQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 outline-none"
          />
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-auto pr-1">
            {(masks ?? [])
              .filter((m) =>
                maskQuery.trim()
                  ? m.name.toLowerCase().includes(maskQuery.toLowerCase())
                  : true
              )
              .map((m) => (
                <div
                  key={m.id}
                  className="p-2 rounded bg-white/5 flex items-center gap-3"
                >
                  <img
                    src={m.url}
                    className="w-16 h-16 object-contain bg-black"
                    alt={m.name}
                  />
                  <div className="flex-1">
                    <div className="text-sm">{m.name}</div>
                    <div className="muted text-xs">
                      {m.width}×{m.height}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeMaskId === m.id ? (
                      <button className="btn" onClick={() => deactivate()}>
                        Désactiver
                      </button>
                    ) : (
                      <button className="btn" onClick={() => activate(m.id)}>
                        Activer
                      </button>
                    )}
                    <button
                      className="btn bg-red-600 hover:bg-red-700"
                      onClick={() =>
                        deleteMask.mutate({ id: m.id, url: m.url })
                      }
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            {(!masks || masks.length === 0) && (
              <div className="muted text-sm">Aucune image téléchargée</div>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}

function PointerPreview({
  imageUrl,
  pointer,
  onCommit,
}: {
  imageUrl: string
  pointer: { x: number; y: number } | null
  onCommit: (x: number, y: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [drag, setDrag] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!imageUrl) {
      setImg(null)
      return
    }
    const i = new Image()
    i.crossOrigin = "anonymous"
    i.onload = () => setImg(i)
    i.src = imageUrl
  }, [imageUrl])
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!

    const resize = () => {
      const w = canvas.parentElement?.clientWidth ?? 600
      const maxH = 380
      let targetW = w
      let targetH = Math.min(maxH, Math.floor((w * 9) / 16))
      if (img) {
        const iw = img.naturalWidth
        const ih = img.naturalHeight
        const portrait = ih > iw
        const rIw = portrait ? ih : iw
        const rIh = portrait ? iw : ih
        const scale = Math.min(w / rIw, maxH / rIh)
        targetW = Math.floor(rIw * scale)
        targetH = Math.floor(rIh * scale)
      }
      const dpr = window.devicePixelRatio || 1
      canvas.style.width = `${targetW}px`
      canvas.style.height = `${targetH}px`
      canvas.width = Math.floor(targetW * dpr)
      canvas.height = Math.floor(targetH * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw()
    }

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const cw = canvas.width / dpr
      const ch = canvas.height / dpr
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, cw, ch)
      if (img) {
        const iw = img.naturalWidth
        const ih = img.naturalHeight
        const portrait = ih > iw
        const rIw = portrait ? ih : iw
        const rIh = portrait ? iw : ih
        const scale = Math.min(cw / rIw, ch / rIh)
        const dw = Math.floor(rIw * scale)
        const dh = Math.floor(rIh * scale)
        const dx = Math.floor((cw - dw) / 2)
        const dy = Math.floor((ch - dh) / 2)
        const off = document.createElement("canvas")
        off.width = dw
        off.height = dh
        const octx = off.getContext("2d")!
        octx.save()
        if (portrait) {
          octx.translate(dw, 0)
          octx.rotate(Math.PI / 2)
          octx.drawImage(img, 0, 0, iw, ih, 0, 0, dh, dw)
        } else {
          octx.drawImage(img, 0, 0, iw, ih, 0, 0, dw, dh)
        }
        octx.restore()
        ctx.drawImage(off, dx, dy)
        ctx.strokeStyle = "#ff3131"
        ctx.lineWidth = 2
        ctx.strokeRect(dx + 1, dy + 1, Math.max(0, dw - 2), Math.max(0, dh - 2))

        const cursor = pos ?? pointer
        if (cursor) {
          // Draw pointer as red dot (pos in image space 0..rIw/rIh)
          const px = dx + Math.max(0, Math.min(rIw, cursor.x)) * (dw / rIw)
          const py = dy + Math.max(0, Math.min(rIh, cursor.y)) * (dh / rIh)
          ctx.fillStyle = "#ff3131"
          ctx.beginPath()
          ctx.arc(px, py, 6, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    resize()
    const ro = new ResizeObserver(() => resize())
    ro.observe(canvas.parentElement || document.body)
    return () => ro.disconnect()
  }, [img, pos, pointer])

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drag) return
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    // Convert to image space based on current drawn rect
    const ctx = canvas.getContext("2d")!
    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    const iw = img?.naturalWidth ?? 1
    const ih = img?.naturalHeight ?? 1
    const portrait = (img?.naturalHeight ?? 0) > (img?.naturalWidth ?? 0)
    const rIw = portrait ? ih : iw
    const rIh = portrait ? iw : ih
    const scale = Math.min(cw / rIw, ch / rIh)
    const dw = rIw * scale
    const dh = rIh * scale
    const dx = (cw - dw) / 2
    const dy = (ch - dh) / 2
    const ix = Math.max(0, Math.min(rIw, (x - dx) / (dw / rIw)))
    const iy = Math.max(0, Math.min(rIh, (y - dy) / (dh / rIh)))
    setPos({ x: ix, y: iy })
  }

  const commit = () => {
    if (pos) onCommit(pos.x, pos.y)
    setDrag(false)
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-auto block bg-black"
      onMouseDown={() => setDrag(true)}
      onMouseMove={handleMove}
      onMouseUp={commit}
      onMouseLeave={commit}
    />
  )
}
