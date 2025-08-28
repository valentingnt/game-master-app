import LEDDisplay from "../ui/LEDDisplay"
import TokenCounter from "../ui/TokenCounter"
import DayController from "../ui/DayController"
import InventoryList from "../ui/InventoryList"
import PlayerCard from "../ui/PlayerCard"
import {
  usePlayers,
  useShop,
  useToggleShopUnlock,
  useUpsertShopItem,
} from "../lib/hooks"
import ShopItemsModal from "../ui/ShopItemsModal"
import { useState } from "react"

export default function Dashboard() {
  const { data: players } = usePlayers()
  const shop1 = useShop("shop1").data
  const shop2 = useShop("shop2").data
  const toggleUnlock = useToggleShopUnlock()
  const upsertItem = useUpsertShopItem()
  const [openModal, setOpenModal] = useState<null | "shop1" | "shop2">(null)
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-1">
          <section>
            <LEDDisplay
              size="lg"
              editable
              text="Welcome to the Wasteland"
              variant="main"
            />
            <div className="grid grid-cols-2 gap-4 mt-3">
              <LEDDisplay size="sm" editable text="Counter A" variant="top" />
              <LEDDisplay
                size="sm"
                editable
                text="Counter B"
                variant="bottom"
              />
            </div>
          </section>
          <section className="space-y-6">
            <TokenCounter />
            <DayController />
            <InventoryList />
            <div className="rounded border border-gray-800 p-4 bg-gray-900">
              <div className="font-semibold mb-2">Shop Controls</div>
              <div className="space-y-3 text-sm">
                {[
                  { label: "Shop 1", data: shop1 },
                  { label: "Shop 2", data: shop2 },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className="w-20 text-gray-400">{s.label}</div>
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
                      Unlocked
                    </label>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    className="px-3 py-1.5 rounded bg-gray-800"
                    onClick={() => setOpenModal("shop1")}
                  >
                    Manage Shop 1 Items
                  </button>
                  <button
                    className="px-3 py-1.5 rounded bg-gray-800"
                    onClick={() => setOpenModal("shop2")}
                  >
                    Manage Shop 2 Items
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3">Players</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(players ?? []).map((p) => (
              <PlayerCard key={p.id} player={p} />
            ))}
          </div>
        </div>
      </div>
      {openModal && (
        <ShopItemsModal
          shopSlug={openModal}
          open={true}
          onClose={() => setOpenModal(null)}
        />
      )}
    </>
  )
}
