import { useAppState, useUpdateAppStateField } from "../lib/hooks"
import TokenCounter from "../ui/TokenCounter"
import DayController from "../ui/DayController"
import InventoryList from "../ui/InventoryList"
import PlayerCard from "../ui/PlayerCard"
import { usePlayers, useShop, useToggleShopUnlock } from "../lib/hooks"
import ShopItemsModal from "../ui/ShopItemsModal"
import MessageHistory from "../ui/MessageHistory"
import { useState } from "react"

export default function Dashboard() {
  const { data: players } = usePlayers()
  const shop1 = useShop("shop1").data
  const shop2 = useShop("shop2").data
  const toggleUnlock = useToggleShopUnlock()
  const [openModal, setOpenModal] = useState<null | "shop1" | "shop2">(null)
  const app = useAppState().data
  const updateMain = useUpdateAppStateField("led_main_text")
  const updateTop = useUpdateAppStateField("led_small_top")
  const updateBottom = useUpdateAppStateField("led_small_bottom")
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-1">
          <section>
            <div className="card-surface p-4">
              <div className="muted text-sm mb-1">Main Announcement</div>
              <textarea
                className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 outline-none resize-none"
                rows={3}
                value={app?.led_main_text ?? ""}
                onChange={(e) => updateMain.mutate(e.target.value)}
                placeholder="Main announcement"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="card-surface p-4">
                <div className="muted text-sm mb-1">Top Counter</div>
                <input
                  className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 outline-none"
                  value={app?.led_small_top ?? ""}
                  onChange={(e) => updateTop.mutate(e.target.value)}
                  placeholder="Top counter"
                />
              </div>
              <div className="card-surface p-4">
                <div className="muted text-sm mb-1">Bottom Counter</div>
                <input
                  className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 outline-none"
                  value={app?.led_small_bottom ?? ""}
                  onChange={(e) => updateBottom.mutate(e.target.value)}
                  placeholder="Bottom counter"
                />
              </div>
            </div>
          </section>
          <section className="space-y-6">
            <TokenCounter />
            <DayController />
            <InventoryList />
            <div className="card-surface p-4">
              <div className="display-title text-base mb-2">Shop Controls</div>
              <div className="space-y-3 text-sm">
                {[
                  { label: "Shop 1", data: shop1 },
                  { label: "Shop 2", data: shop2 },
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
                      Unlocked
                    </label>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2">
                  <button className="btn" onClick={() => setOpenModal("shop1")}>
                    Manage Shop 1 Items
                  </button>
                  <button className="btn" onClick={() => setOpenModal("shop2")}>
                    Manage Shop 2 Items
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2">
          <h2 className="display-title text-lg mb-3">Players</h2>
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
