import { useState } from "react"
import {
  useShop,
  useAppState,
  usePurchaseItem,
  useToggleShopItemDisabled,
} from "../lib/hooks"

type Props = { shopId: "shop1" | "shop2" }

export default function Shop({ shopId }: Props) {
  const { data } = useShop(shopId)
  const tokens = useAppState().data?.tokens ?? 0
  const purchase = usePurchaseItem()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const toggleItemDisabled = useToggleShopItemDisabled()

  const items = data?.items ?? []
  const unlocked = data?.shop?.unlocked ?? false

  const onBuy = (id: string, price: number) => {
    if (tokens < price) return alert("Not enough tokens")
    setConfirmId(id)
  }

  const confirmBuy = (
    id: string,
    price: number,
    name: string,
    bundle: number
  ) => {
    purchase.mutate({ name, price, bundle_quantity: bundle })
    setConfirmId(null)
    alert(`Purchased ${bundle > 1 ? `${bundle}x ` : ""}${name}`)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">
        {shopId === "shop1" ? "Shop 1" : "Shop 2"}
      </h1>
      {!unlocked && (
        <p className="text-sm text-yellow-400">This shop is locked.</p>
      )}
      {unlocked && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <div
              key={it.id}
              className={`rounded border border-gray-800 p-4 bg-gray-900 ${
                it.disabled ? "opacity-50" : ""
              }`}
            >
              <div className="font-medium">{it.name}</div>
              <div className="text-sm text-gray-400">
                Price: {it.price} tokens
              </div>
              {it.bundle_quantity > 1 && (
                <div className="text-xs text-gray-500">
                  Bundle: {it.bundle_quantity}
                </div>
              )}
              {/* All changes disabled on shop pages; only Buy is interactive */}
              <button
                disabled={!unlocked || !!it.disabled}
                className="mt-3 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
                onClick={() => onBuy(it.id, it.price)}
              >
                Buy
              </button>
              {confirmId === it.id && (
                <div className="mt-3 p-3 border border-gray-700 rounded">
                  <div className="text-sm mb-2">Confirm purchase?</div>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1.5 rounded bg-gray-700"
                      onClick={() => setConfirmId(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-3 py-1.5 rounded bg-blue-600"
                      onClick={() =>
                        confirmBuy(it.id, it.price, it.name, it.bundle_quantity)
                      }
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
