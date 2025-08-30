import { useEffect, useMemo, useState } from "react"
import {
  useShop,
  useUpsertShopItem,
  useDeleteShopItem,
  useToggleShopItemDisabled,
} from "../lib/hooks"
import { useToast } from "./Toast"

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded shadow-xl w-full max-w-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">
            Manage Items – {shopSlug.toUpperCase()}
          </div>
          <button className="px-2 py-1 rounded bg-gray-800" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {items.map((it) => (
            <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
              <input
                className="col-span-5 bg-gray-800 rounded px-2 py-1"
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
              <input
                type="number"
                className="col-span-3 bg-gray-800 rounded px-2 py-1"
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
              <input
                type="number"
                className="col-span-2 bg-gray-800 rounded px-2 py-1"
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
              <label className="col-span-2 flex items-center gap-2 text-sm">
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
                            message: "Availability updated",
                          }),
                        onError: () =>
                          show({
                            type: "error",
                            message:
                              "Failed to update availability (queued if offline)",
                          }),
                      }
                    )
                  }
                />
                Disabled
              </label>
              <button
                className="col-span-2 px-2 py-1 rounded bg-red-700"
                onClick={() =>
                  shopId && del.mutate({ id: it.id, shop_id: shopId })
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-gray-800 pt-3">
          <div className="text-sm text-gray-400 mb-2">Add Item</div>
          <div className="grid grid-cols-12 gap-2 items-center">
            <input
              className="col-span-5 bg-gray-800 rounded px-2 py-1"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="number"
              className="col-span-3 bg-gray-800 rounded px-2 py-1"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value || 0))}
            />
            <input
              type="number"
              className="col-span-2 bg-gray-800 rounded px-2 py-1"
              placeholder="Bundle"
              value={bundle}
              onChange={(e) => setBundle(Number(e.target.value || 1))}
            />
            <button
              className="col-span-2 px-2 py-1 rounded bg-blue-600"
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
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
