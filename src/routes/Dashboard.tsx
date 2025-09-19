import {
  useAppState,
  useUpdateAppStateField,
  useMaskImages,
  useUploadMaskImage,
  useActivateMask,
  useToggleSpotlight,
  useToggleSpotlightOnDisplay,
  useUpdateSpotlightTargets,
} from "../lib/hooks"
import TokenCounter from "../ui/TokenCounter"
import DayController from "../ui/DayController"
import InventoryList from "../ui/InventoryList"
import PlayerCard from "../ui/PlayerCard"
import {
  usePlayers,
  useShop,
  useToggleShopUnlock,
  useInventory,
  usePlayerInventory,
  useTransferCommonToPlayer,
  useTransferPlayerToCommon,
} from "../lib/hooks"
import ShopItemsModal from "../ui/ShopItemsModal"
import Modal from "../ui/Modal"
import MessageHistory from "../ui/MessageHistory"
import React, { useState, useRef, useEffect } from "react"
import {
  useActiveMaskImage,
  useUpdateMaskPointer,
  useMaskPointer,
  useSetMaskRotationQuarters,
} from "../lib/hooks"
import { useToast } from "../ui/Toast"

export default function Dashboard() {
  const { data: players } = usePlayers()
  const shop1 = useShop("shop1").data
  const shop2 = useShop("shop2").data
  const toggleUnlock = useToggleShopUnlock()
  const [openModal, setOpenModal] = useState<null | "shop1" | "shop2">(null)
  const [openMasks, setOpenMasks] = useState(false)
  const [maskQuery, setMaskQuery] = useState("")
  const [tab, setTab] = useState<"general" | "characters">("general")
  const app = useAppState().data
  const updateMain = useUpdateAppStateField("led_main_text")
  const updateTop = useUpdateAppStateField("led_small_top")
  const updateBottom = useUpdateAppStateField("led_small_bottom")
  const { data: masks } = useMaskImages()
  const uploadMask = useUploadMaskImage()
  const { activate, deactivate } = useActivateMask()
  const activeMaskId = app?.active_mask_id ?? null
  const activeMask = useActiveMaskImage().data
  const toggleSpotlight = useToggleSpotlight()
  const toggleSpotlightOnDisplay = useToggleSpotlightOnDisplay()
  const updateTargets = useUpdateSpotlightTargets()
  // Pointer update
  const { mutate: updatePointer } = useUpdateMaskPointer()
  const serverPointer = useMaskPointer().data
  const setRotationQuarters = useSetMaskRotationQuarters()
  const playerRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const setPlayerRef = (id: string) => (el: HTMLDivElement | null) => {
    playerRefs.current[id] = el
  }
  type MaskNode =
    | { _type: "dir"; children: Record<string, MaskNode> }
    | { _type: "file"; item: any }

  // Upload state (used inside modal)
  const [selectedFolder, setSelectedFolder] = useState<string>("/")
  const [customFolder, setCustomFolder] = useState<string>("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadName, setUploadName] = useState<string>("")
  const [pickerId, setPickerId] = useState<string>("")

  // Transfer inventories state
  const { data: commonInv } = useInventory()
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
  const { data: personalInv } = usePlayerInventory(selectedPlayerId || "")
  const [commonItem, setCommonItem] = useState<string>("")
  const [qtyToPlayer, setQtyToPlayer] = useState<number>(1)
  const [personalItem, setPersonalItem] = useState<string>("")
  const [qtyToCommon, setQtyToCommon] = useState<number>(1)
  const transferC2P = useTransferCommonToPlayer()
  const transferP2C = useTransferPlayerToCommon()
  const { show } = useToast()

  useEffect(() => {
    setPickerId(activeMask?.id ?? "")
  }, [activeMask?.id])

  return (
    <div className="dashboard-page">
      {/* Tabs header */}
      <div className="mb-4">
        <div className="inline-flex rounded border border-white/10">
          <button
            className={`px-4 py-2 text-sm ${
              tab === "general"
                ? "bg-white/10"
                : "bg-transparent hover:bg-white/5"
            }`}
            onClick={() => setTab("general")}
          >
            Général
          </button>
          <button
            className={`px-4 py-2 text-sm ${
              tab === "characters"
                ? "bg-white/10"
                : "bg-transparent hover:bg-white/5"
            }`}
            onClick={() => setTab("characters")}
          >
            Personnages
          </button>
        </div>
      </div>

      {tab === "general" && (
        <>
          {/* Section 1: Tokens, Day, LED Panels */}
          <div className="mb-6">
            <div className="display-title text-xl md:text-2xl mb-4">
              Ressources globales
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Tokens */}
              <div>
                <div className="text-xs uppercase tracking-wider muted mb-2">
                  Tokens
                </div>
                <TokenCounter showTitle={false} />
              </div>
              {/* Day */}
              <div>
                <div className="text-xs uppercase tracking-wider muted mb-2">
                  Jour
                </div>
                <DayController showTitle={false} />
              </div>
              {/* LED panels (full width on large) */}
              <div className="lg:col-span-3">
                <div className="text-xs uppercase tracking-wider muted mb-2">
                  Panneaux LED
                </div>
                <div className="card-surface p-4">
                  <textarea
                    className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 outline-none resize-none"
                    rows={3}
                    value={app?.led_main_text ?? ""}
                    onChange={(e) => updateMain.mutate(e.target.value)}
                    placeholder="Texte du panneau principal…"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                    <div className="card-surface p-4">
                      <div className="text-xs uppercase tracking-wider muted mb-1">
                        Panneau secondaire de gauche
                      </div>
                      <input
                        className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 outline-none"
                        value={app?.led_small_top ?? ""}
                        onChange={(e) => updateTop.mutate(e.target.value)}
                        placeholder="Texte…"
                      />
                    </div>
                    <div className="card-surface p-4">
                      <div className="text-xs uppercase tracking-wider muted mb-1">
                        Panneau secondaire de droite
                      </div>
                      <input
                        className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 outline-none"
                        value={app?.led_small_bottom ?? ""}
                        onChange={(e) => updateBottom.mutate(e.target.value)}
                        placeholder="Texte…"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Shops control */}
          <div className="mb-6">
            <div className="display-title text-xl md:text-2xl mb-4">
              Boutiques
            </div>
            <div className="card-surface p-4">
              <div className="space-y-3 text-sm">
                <div className="text-xs uppercase tracking-wider muted">
                  Statut
                </div>
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
                <div className="text-xs uppercase tracking-wider muted pt-2">
                  Gestion des items
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn" onClick={() => setOpenModal("shop1")}>
                    Gérer les items de la boutique 1
                  </button>
                  <button className="btn" onClick={() => setOpenModal("shop2")}>
                    Gérer les items de la boutique 2
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Inventory and inventory transfer */}
          <div className="mb-6">
            <div className="display-title text-xl md:text-2xl mb-4">
              Inventaire & Transferts
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="text-xs uppercase tracking-wider muted mb-2">
                  Inventaire
                </div>
                <InventoryList showTitle={false} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider muted mb-2">
                  Transferts d'inventaire
                </div>
                <div className="card-surface p-4 space-y-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                    <div className="text-xs uppercase tracking-wider muted">
                      Joueur
                    </div>
                    <select
                      className="bg-white/10 border border-white/10 rounded px-2 py-2"
                      value={selectedPlayerId}
                      onChange={(e) => {
                        setSelectedPlayerId(e.target.value)
                        setPersonalItem("")
                      }}
                    >
                      <option value="">Sélectionner…</option>
                      {(players ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.first_name} {p.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Common -> Player */}
                    <div className="bg-white/5 rounded p-3 border border-white/10">
                      <div className="text-xs uppercase tracking-wider muted mb-2">
                        Commun → Joueur
                      </div>
                      <div className="space-y-2">
                        <select
                          className="w-full bg-white/10 border border-white/10 rounded px-2 py-2"
                          value={commonItem}
                          onChange={(e) => setCommonItem(e.target.value)}
                        >
                          <option value="">Item…</option>
                          {(commonInv ?? [])
                            .filter((i) => (i.quantity ?? 0) > 0)
                            .map((i) => (
                              <option key={i.id} value={i.item_name}>
                                {i.item_name} (x{i.quantity})
                              </option>
                            ))}
                        </select>
                        {(() => {
                          const max = Math.max(
                            0,
                            (commonInv ?? []).find(
                              (i) => i.item_name === commonItem
                            )?.quantity || 0
                          )
                          return (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                className="w-24 bg-white/10 border border-white/10 rounded px-2 py-1"
                                value={qtyToPlayer}
                                onChange={(e) =>
                                  setQtyToPlayer(
                                    Math.max(0, Number(e.target.value || 0))
                                  )
                                }
                                min={0}
                                max={max}
                              />
                              <div className="text-xs uppercase tracking-wider muted">
                                Max: {max}
                              </div>
                              <button
                                className="btn ml-auto"
                                disabled={
                                  !selectedPlayerId ||
                                  !commonItem ||
                                  qtyToPlayer <= 0 ||
                                  qtyToPlayer > max
                                }
                                onClick={() => {
                                  if (
                                    !selectedPlayerId ||
                                    !commonItem ||
                                    qtyToPlayer <= 0 ||
                                    qtyToPlayer > max
                                  )
                                    return
                                  transferC2P.mutate(
                                    {
                                      player_id: selectedPlayerId,
                                      item_name: commonItem,
                                      quantity: qtyToPlayer,
                                    },
                                    {
                                      onSuccess: () =>
                                        show({
                                          type: "success",
                                          message:
                                            "Transfert vers joueur effectué",
                                        }),
                                      onError: () =>
                                        show({
                                          type: "error",
                                          message: "Transfert impossible",
                                        }),
                                    }
                                  )
                                }}
                              >
                                Transférer
                              </button>
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Player -> Common */}
                    <div className="bg-white/5 rounded p-3 border border-white/10">
                      <div className="text-xs uppercase tracking-wider muted mb-2">
                        Joueur → Commun
                      </div>
                      <div className="space-y-2">
                        <select
                          className="w-full bg-white/10 border border-white/10 rounded px-2 py-2"
                          value={personalItem}
                          onChange={(e) => setPersonalItem(e.target.value)}
                          disabled={!selectedPlayerId}
                        >
                          <option value="">Item…</option>
                          {(personalInv ?? [])
                            .filter((i) => (i.quantity ?? 0) > 0)
                            .map((i) => (
                              <option key={i.id} value={i.item_name}>
                                {i.item_name} (x{i.quantity})
                              </option>
                            ))}
                        </select>
                        {(() => {
                          const max = Math.max(
                            0,
                            (personalInv ?? []).find(
                              (i) => i.item_name === personalItem
                            )?.quantity || 0
                          )
                          return (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                className="w-24 bg-white/10 border border-white/10 rounded px-2 py-1"
                                value={qtyToCommon}
                                onChange={(e) =>
                                  setQtyToCommon(
                                    Math.max(0, Number(e.target.value || 0))
                                  )
                                }
                                min={0}
                                max={max}
                                disabled={!selectedPlayerId}
                              />
                              <div className="text-xs uppercase tracking-wider muted">
                                Max: {max}
                              </div>
                              <button
                                className="btn ml-auto"
                                disabled={
                                  !selectedPlayerId ||
                                  !personalItem ||
                                  qtyToCommon <= 0 ||
                                  qtyToCommon > max
                                }
                                onClick={() => {
                                  if (
                                    !selectedPlayerId ||
                                    !personalItem ||
                                    qtyToCommon <= 0 ||
                                    qtyToCommon > max
                                  )
                                    return
                                  transferP2C.mutate(
                                    {
                                      player_id: selectedPlayerId,
                                      item_name: personalItem,
                                      quantity: qtyToCommon,
                                    },
                                    {
                                      onSuccess: () =>
                                        show({
                                          type: "success",
                                          message:
                                            "Transfert vers commun effectué",
                                        }),
                                      onError: () =>
                                        show({
                                          type: "error",
                                          message: "Transfert impossible",
                                        }),
                                    }
                                  )
                                }}
                              >
                                Transférer
                              </button>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Images and mask snipper */}
          <div className="mb-6">
            <div className="display-title text-xl md:text-2xl mb-4">
              Images & Masque
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Images / Spotlight controls */}
              <div>
                <div className="text-xs uppercase tracking-wider muted mb-2">
                  Images / Spotlight
                </div>
                <div className="card-surface p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!app?.mask_spotlight_enabled}
                        onChange={(e) =>
                          toggleSpotlight.mutate(e.target.checked as any)
                        }
                      />
                      Activer mode spotlight
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!app?.mask_show_on_display}
                        onChange={(e) =>
                          toggleSpotlightOnDisplay.mutate(
                            e.target.checked as any
                          )
                        }
                      />
                      Afficher sur écran Display
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="btn" onClick={() => setOpenMasks(true)}>
                      Gérer les images
                    </button>
                  </div>

                  <div className="border-t border-white/10 pt-3 space-y-3 text-sm">
                    <div className="text-xs uppercase tracking-wider muted">
                      Statut actuel
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="muted">Image active:</div>
                      <div className="truncate max-w-[220px]">
                        {activeMask?.name ||
                          (activeMask?.url ? "Image active" : "Aucune")}
                      </div>
                      {activeMask?.id && (
                        <>
                          <button
                            className="btn"
                            onClick={() => {
                              const q =
                                ((activeMask.rotation_quarters ?? 0) + 3) % 4
                              setRotationQuarters.mutate({
                                id: activeMask.id,
                                rotation_quarters: q,
                              })
                            }}
                            title="Tourner -90°"
                          >
                            ⟲
                          </button>
                          <button
                            className="btn"
                            onClick={() => {
                              const q =
                                ((activeMask.rotation_quarters ?? 0) + 1) % 4
                              setRotationQuarters.mutate({
                                id: activeMask.id,
                                rotation_quarters: q,
                              })
                            }}
                            title="Tourner +90°"
                          >
                            ⟳
                          </button>
                          <button className="btn" onClick={() => deactivate()}>
                            Désactiver
                          </button>
                        </>
                      )}
                    </div>

                    <div className="text-xs uppercase tracking-wider muted">
                      Cibles (joueurs)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(players ?? []).map((p) => {
                        const selected = (
                          app?.mask_target_player_ids ?? []
                        ).includes(p.id)
                        return (
                          <label key={p.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) => {
                                const prev = (app?.mask_target_player_ids ??
                                  []) as string[]
                                const next = e.target.checked
                                  ? Array.from(new Set([...prev, p.id]))
                                  : prev.filter((id) => id !== p.id)
                                updateTargets.mutate(next as any)
                              }}
                            />
                            {p.first_name} {p.last_name}
                          </label>
                        )
                      })}
                    </div>

                    <div className="text-xs uppercase tracking-wider muted pt-2">
                      Changer l'image
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                      <input
                        className="bg-white/10 border border-white/10 rounded px-2 py-1"
                        placeholder="Rechercher…"
                        value={maskQuery}
                        onChange={(e) => setMaskQuery(e.target.value)}
                      />
                      <select
                        className="bg-white/10 border border-white/10 rounded px-2 py-2"
                        value={pickerId}
                        onChange={(e) => setPickerId(e.target.value)}
                      >
                        <option value="">Sélectionner…</option>
                        {(() => {
                          const q = maskQuery.trim().toLowerCase()
                          const list = (masks ?? []).filter((m) =>
                            q
                              ? (m.name || "").toLowerCase().includes(q) ||
                                (m.storage_path || "").toLowerCase().includes(q)
                              : true
                          )
                          list.sort((a, b) =>
                            (a.name || "").localeCompare(b.name || "")
                          )
                          return list.map((m) => (
                            <option key={m.id} value={m.id}>
                              {(m.name || "").slice(0, 60)}
                            </option>
                          ))
                        })()}
                      </select>
                      <button
                        className="btn"
                        disabled={
                          !pickerId || pickerId === (activeMask?.id || "")
                        }
                        onClick={() => {
                          if (!pickerId) return
                          activate(pickerId)
                          show({ type: "success", message: "Image activée" })
                        }}
                      >
                        Activer
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mask snipper / pointer preview */}
              <div>
                <div className="text-xs uppercase tracking-wider muted mb-2">
                  Aperçu masque (sans effet)
                </div>
                <div className="card-surface p-4">
                  <PointerPreview
                    imageUrl={activeMask?.url || ""}
                    pointer={
                      serverPointer
                        ? { x: serverPointer.x, y: serverPointer.y }
                        : null
                    }
                    onCommit={(x, y) => updatePointer({ x, y })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Messages */}
          <div className="mb-2">
            <div className="display-title text-xl md:text-2xl mb-4">
              Messages
            </div>
            <MessageHistory showTitle={false} />
          </div>
        </>
      )}

      {tab === "characters" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left nav */}
          <div className="lg:col-span-1 pr-1">
            <div className="card-surface p-4 lg:sticky lg:top-2">
              <div className="display-title text-base mb-3">Personnages</div>
              <div className="space-y-2 text-sm">
                {(players ?? []).map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left btn btn-ghost"
                    onClick={() =>
                      playerRefs.current[p.id]?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                    }
                  >
                    {p.first_name} {p.last_name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right content: players */}
          <div className="lg:col-span-3 lg:min-h-0 pr-1">
            <h2 className="display-title text-lg mb-3">Joueurs</h2>
            <div className="space-y-16">
              {(players ?? []).map((p) => (
                <div key={p.id} ref={setPlayerRef(p.id)}>
                  <PlayerCard player={p} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
        title="Images (arborescence)"
        maxWClass="max-w-6xl"
      >
        <div className="space-y-3">
          {(() => {
            const folders = new Set<string>()
            folders.add("/")
            const addParents = (p: string) => {
              const segs = p.split("/").filter(Boolean)
              let acc: string[] = []
              for (const s of segs) {
                acc.push(s)
                folders.add("/" + acc.join("/"))
              }
            }
            for (const m of masks ?? []) {
              const sp = (m.storage_path || "").split("/").filter(Boolean)
              if (sp.length > 1) {
                const folder = "/" + sp.slice(0, -1).join("/")
                addParents(folder)
              }
            }
            const sortedFolders = Array.from(folders).sort((a, b) =>
              a.localeCompare(b)
            )
            return (
              <div className="card-surface p-3">
                <div className="text-xs uppercase tracking-wider muted mb-2">
                  Téléverser une image
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <select
                    className="bg-white/10 border border-white/10 rounded px-2 py-2"
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                  >
                    {sortedFolders.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <input
                    className="bg-white/10 border border-white/10 rounded px-2 py-2"
                    placeholder="Ou nouveau dossier (ex: /donjon/salle1)"
                    value={customFolder}
                    onChange={(e) => setCustomFolder(e.target.value)}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null
                      setUploadFile(f)
                      setUploadName(f ? f.name : "")
                    }}
                  />
                  <input
                    className="bg-white/10 border border-white/10 rounded px-2 py-2"
                    placeholder="Nom de l'image"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                  />
                </div>
                <div className="mt-2">
                  <button
                    className="btn"
                    onClick={() => {
                      if (!uploadFile || !uploadName) return
                      const folderPath = (
                        customFolder ||
                        selectedFolder ||
                        "/"
                      ).trim()
                      const normalized =
                        folderPath === "/"
                          ? undefined
                          : folderPath.replace(/^\/+/, "")
                      uploadMask.mutate({
                        file: uploadFile,
                        name: uploadName,
                        folder: normalized,
                      })
                      setUploadFile(null)
                      setUploadName("")
                    }}
                  >
                    Téléverser
                  </button>
                </div>
              </div>
            )
          })()}
          <input
            value={maskQuery}
            onChange={(e) => setMaskQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 outline-none"
          />
          <div className="max-h-[70vh] overflow-auto pr-1">
            {(() => {
              const list = (masks ?? []).filter((m) => {
                const matchQ = maskQuery.trim()
                  ? (m.name || "")
                      .toLowerCase()
                      .includes(maskQuery.toLowerCase()) ||
                    (m.storage_path || "")
                      .toLowerCase()
                      .includes(maskQuery.toLowerCase())
                  : true
                return matchQ
              })
              const tree: Record<string, MaskNode> = {}
              for (const m of list) {
                const path = (m.storage_path || m.name || "")
                  .split("/")
                  .filter(Boolean)
                let cursor = tree
                for (let i = 0; i < path.length - 1; i++) {
                  const seg = String(path[i])
                  cursor[seg] = cursor[seg] || { _type: "dir", children: {} }
                  cursor = (cursor[seg] as any).children
                }
                const leaf = String(path[path.length - 1] || m.name)
                cursor[leaf] = { _type: "file", item: m }
              }
              const CollapsibleTree: React.FC<{
                node: Record<string, MaskNode>
                base?: string[]
              }> = ({ node, base = [] }) => {
                const [openDirs, setOpenDirs] = React.useState<
                  Record<string, boolean>
                >({})
                const toggle = (path: string) =>
                  setOpenDirs((s) => ({ ...s, [path]: !s[path] }))
                const entries = Object.entries(node).sort((a, b) =>
                  a[0].localeCompare(b[0])
                )
                const dirs = entries.filter(([, n]) => n._type === "dir")
                const files = entries.filter(([, n]) => n._type === "file")
                return (
                  <div className="pl-2">
                    {files.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-3">
                        {files.map(([name, n]) => {
                          const m = (n as any).item
                          return (
                            <div
                              key={m.id}
                              className="p-2 rounded bg-white/5 flex flex-col gap-2 text-white"
                            >
                              <img
                                src={m.url}
                                className="w-full h-28 object-contain bg-black"
                                alt={m.name}
                              />
                              <div
                                className="text-sm truncate font-bold"
                                title={m.name}
                              >
                                {m.name}
                              </div>
                              <div
                                className="muted text-xs truncate"
                                title={m.storage_path || ""}
                              >
                                {m.storage_path || ""}
                              </div>
                              <div className="muted text-xs">
                                {m.width}×{m.height}
                              </div>
                              <div className="mt-1">
                                {activeMaskId === m.id ? (
                                  <span className="badge">Actif</span>
                                ) : (
                                  <button
                                    className="btn"
                                    onClick={() => activate(m.id)}
                                  >
                                    Activer
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {dirs.map(([name, n]) => {
                      const pathKey = [...base, name].join("/")
                      const isOpen = openDirs[pathKey] ?? true
                      return (
                        <div key={name} className="mb-2">
                          <button
                            className="text-xs muted hover:text-white transition-colors"
                            onClick={() => toggle(pathKey)}
                          >
                            {isOpen ? "▾" : "▸"} /{pathKey}
                          </button>
                          {isOpen && (
                            <CollapsibleTree
                              node={(n as any).children}
                              base={[...base, name]}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              }
              return <CollapsibleTree node={tree} />
            })()}
          </div>
        </div>
      </Modal>
    </div>
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
