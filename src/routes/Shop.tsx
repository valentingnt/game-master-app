import { useState } from "react"
import {
  useShop,
  useAppState,
  usePurchaseItem,
  useToggleShopItemDisabled,
} from "../lib/hooks"
import Modal from "../ui/Modal"
import { useToast } from "../ui/Toast"

type Props = { shopId: "shop1" | "shop2" }

export default function Shop({ shopId }: Props) {
  const { data } = useShop(shopId)
  const tokens = useAppState().data?.tokens ?? 0
  const purchase = usePurchaseItem()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const toggleItemDisabled = useToggleShopItemDisabled()
  const { show } = useToast()

  const items = data?.items ?? []
  const unlocked = data?.shop?.unlocked ?? false

  const onBuy = (id: string, price: number) => {
    if (tokens < price) {
      show({ type: "error", message: "Not enough tokens" })
      return
    }
    setConfirmId(id)
  }

  const confirmBuy = (
    id: string,
    price: number,
    name: string,
    bundle: number
  ) => {
    purchase.mutate(
      { name, price, bundle_quantity: bundle },
      {
        onSuccess: () =>
          show({
            type: "success",
            message: `Purchased ${bundle > 1 ? `${bundle}x ` : ""}${name}`,
          }),
        onError: (e) =>
          show({
            type: "error",
            message:
              (e as any)?.message === "INSUFFICIENT_TOKENS"
                ? "Not enough tokens"
                : "Purchase failed (queued if offline)",
          }),
      }
    )
    setConfirmId(null)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <h1 className="display-title text-2xl uppercase tracking-widest">
          {shopId === "shop1" ? "Shop 1" : "Shop 2"}
        </h1>
        <div className="muted text-sm">Balance: {tokens} tokens</div>
      </div>
      {!unlocked && (
        <p className="text-sm text-yellow-400">This shop is locked.</p>
      )}
      {unlocked && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it, idx) => (
            <div
              key={it.id}
              className={`shop-card card-hover tilt-hover relative overflow-hidden ${
                it.disabled ? "opacity-50" : ""
              }`}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="display-title text-lg">{it.name}</div>
                  <div className="text-sm muted">{it.price} tokens</div>
                </div>
                {it.bundle_quantity > 1 && (
                  <div className="badge">x{it.bundle_quantity}</div>
                )}
              </div>
              {it.disabled && (
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm grid place-items-center text-xs uppercase tracking-wider">
                  Unavailable
                </div>
              )}
              <button
                disabled={!unlocked || !!it.disabled}
                className="mt-4 btn btn-primary btn-shine disabled:opacity-50"
                onClick={() => onBuy(it.id, it.price)}
              >
                Purchase
              </button>
              <Modal
                open={confirmId === it.id}
                onClose={() => setConfirmId(null)}
                title="Confirm Purchase"
              >
                <div className="space-y-3">
                  <div className="text-sm text-gray-300">
                    Buy{" "}
                    {it.bundle_quantity > 1 ? `${it.bundle_quantity}x ` : ""}
                    {it.name} for {it.price} tokens?
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button className="btn" onClick={() => setConfirmId(null)}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        confirmBuy(it.id, it.price, it.name, it.bundle_quantity)
                      }
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </Modal>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
