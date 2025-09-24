import { useEffect, useMemo, useState } from "react"
import {
  useShop,
  useUpsertShopItem,
  useDeleteShopItem,
  useToggleShopItemDisabled,
} from "../lib/hooks"
import { useToast } from "./Toast"
import Modal from "./Modal"

type Props = {
  shopSlug: "shop1" | "shop2"
  open: boolean
  onClose: () => void
}

export default function ShopItemsModal({ shopSlug, open, onClose }: Props) {
  const { data } = useShop(shopSlug)
  const upsert = useUpsertShopItem()
  const del = useDeleteShopItem()
  const toggleDisabled = useToggleShopItemDisabled()
  const [name, setName] = useState("")
  const [price, setPrice] = useState<number>(10)
  const [bundle, setBundle] = useState<number>(1)
  const [drafts, setDrafts] = useState<
    Record<string, { name: string; price: number; bundle_quantity: number }>
  >({})

  useEffect(() => {
    if (!open) {
      setName("")
      setPrice(10)
      setBundle(1)
    }
  }, [open])

  if (!open) return null

  const shopId = data?.shop?.id
  const items = useMemo(() => data?.items ?? [], [data?.items])
  const { show } = useToast()

  useEffect(() => {
    const next: Record<
      string,
      { name: string; price: number; bundle_quantity: number }
    > = {}
    for (const it of items) {
      next[it.id] = {
        name: drafts[it.id]?.name ?? it.name,
        price: drafts[it.id]?.price ?? it.price,
        bundle_quantity: drafts[it.id]?.bundle_quantity ?? it.bundle_quantity,
      }
    }
    setDrafts(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Gérer les items – ${shopSlug.toUpperCase()}`}
    >
      <div className="space-y-3 max-h-[60vh] overflow-auto">
        <div className="text-xs uppercase tracking-wider muted">
          Items existants
        </div>
        {items.map((it) => (
          <div key={it.id} className="flex flex-wrap gap-2 items-center">
            <div className="flex-1 min-w-[180px]">
              <label
                htmlFor={`name-${it.id}`}
                className="block text-xs text-gray-300 mb-1"
              >
                Nom
              </label>
              <input
                id={`name-${it.id}`}
                className="bg-white/10 border border-white/10 rounded px-2 py-1 w-full"
                value={drafts[it.id]?.name ?? it.name}
                onChange={(e) =>
                  setDrafts((d) => ({
                    ...d,
                    [it.id]: {
                      ...(d[it.id] ?? {
                        name: it.name,
                        price: it.price,
                        bundle_quantity: it.bundle_quantity,
                      }),
                      name: e.target.value,
                    },
                  }))
                }
                onBlur={() => {
                  if (!shopId) return
                  const d = drafts[it.id]
                  if (!d) return
                  upsert.mutate({
                    id: it.id,
                    shop_id: shopId,
                    name: d.name,
                    price: d.price,
                    bundle_quantity: d.bundle_quantity,
                    disabled: it.disabled ?? false,
                  })
                }}
              />
            </div>
            <div className="w-24">
              <label
                htmlFor={`price-${it.id}`}
                className="block text-xs text-gray-300 mb-1"
              >
                Prix
              </label>
              <input
                id={`price-${it.id}`}
                type="number"
                className="bg-white/10 border border-white/10 rounded px-2 py-1 w-full"
                value={drafts[it.id]?.price ?? it.price}
                onChange={(e) =>
                  setDrafts((d) => ({
                    ...d,
                    [it.id]: {
                      ...(d[it.id] ?? {
                        name: it.name,
                        price: it.price,
                        bundle_quantity: it.bundle_quantity,
                      }),
                      price: Number(e.target.value || 0),
                    },
                  }))
                }
                onBlur={() => {
                  if (!shopId) return
                  const d = drafts[it.id]
                  if (!d) return
                  upsert.mutate({
                    id: it.id,
                    shop_id: shopId,
                    name: d.name,
                    price: d.price,
                    bundle_quantity: d.bundle_quantity,
                    disabled: it.disabled ?? false,
                  })
                }}
              />
            </div>
            <div className="w-24">
              <label
                htmlFor={`bundle-${it.id}`}
                className="block text-xs text-gray-300 mb-1"
              >
                Quantité
              </label>
              <input
                id={`bundle-${it.id}`}
                type="number"
                className="bg-white/10 border border-white/10 rounded px-2 py-1 w-full"
                value={drafts[it.id]?.bundle_quantity ?? it.bundle_quantity}
                onChange={(e) =>
                  setDrafts((d) => ({
                    ...d,
                    [it.id]: {
                      ...(d[it.id] ?? {
                        name: it.name,
                        price: it.price,
                        bundle_quantity: it.bundle_quantity,
                      }),
                      bundle_quantity: Number(e.target.value || 1),
                    },
                  }))
                }
                onBlur={() => {
                  if (!shopId) return
                  const d = drafts[it.id]
                  if (!d) return
                  upsert.mutate({
                    id: it.id,
                    shop_id: shopId,
                    name: d.name,
                    price: d.price,
                    bundle_quantity: d.bundle_quantity,
                    disabled: it.disabled ?? false,
                  })
                }}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-100">
              <input
                type="checkbox"
                checked={!!it.disabled}
                onChange={(e) =>
                  shopId &&
                  toggleDisabled.mutate(
                    {
                      id: it.id,
                      disabled: e.target.checked,
                      shop_id: shopId,
                    },
                    {
                      onSuccess: () =>
                        show({
                          type: "success",
                          message: "Disponibilité mise à jour",
                        }),
                      onError: () =>
                        show({
                          type: "error",
                          message:
                            "Échec de la mise à jour de la disponibilité (mis en file d'attente si hors ligne)",
                        }),
                    }
                  )
                }
              />
              Désactivé
            </label>
            <button
              className="btn bg-red-700 border-red-700 hover:bg-red-600"
              onClick={() =>
                shopId && del.mutate({ id: it.id, shop_id: shopId })
              }
            >
              Supprimer
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-white/10 pt-3">
        <div className="text-xs uppercase tracking-wider muted mb-2">
          Ajouter un item
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[180px]">
            <label
              htmlFor="new-item-name"
              className="block text-xs text-gray-300 mb-1"
            >
              Nom
            </label>
            <input
              id="new-item-name"
              className="bg-white/10 border border-white/10 rounded px-2 py-1 w-full"
              placeholder="Nom de l'item"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="w-24">
            <label
              htmlFor="new-item-price"
              className="block text-xs text-gray-300 mb-1"
            >
              Prix
            </label>
            <input
              id="new-item-price"
              type="number"
              className="bg-white/10 border border-white/10 rounded px-2 py-1 w-full"
              placeholder="Prix"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value || 0))}
            />
          </div>
          <div className="w-24">
            <label
              htmlFor="new-item-bundle"
              className="block text-xs text-gray-300 mb-1"
            >
              Quantité
            </label>
            <input
              id="new-item-bundle"
              type="number"
              className="bg-white/10 border border-white/10 rounded px-2 py-1 w-full"
              placeholder="Quantité"
              value={bundle}
              onChange={(e) => setBundle(Number(e.target.value || 1))}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!shopId || !name) return
              upsert.mutate({
                shop_id: shopId,
                name,
                price,
                bundle_quantity: bundle,
              })
              setName("")
              setPrice(10)
              setBundle(1)
            }}
          >
            Ajouter
          </button>
        </div>
      </div>
    </Modal>
  )
}
