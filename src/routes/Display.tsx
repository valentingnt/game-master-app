import LEDDisplay from "../ui/LEDDisplay"
import { useAppState, useInventory } from "../lib/hooks"

export default function Display() {
  const { data: app } = useAppState()
  const { data: inv } = useInventory()

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <main className="px-4 py-6 space-y-6">
        <section>
          <LEDDisplay
            size="lg"
            text={app?.led_main_text ?? ""}
            variant="main"
          />
          <div className="grid grid-cols-2 gap-4 mt-3">
            <LEDDisplay
              size="sm"
              text={app?.led_small_top ?? ""}
              variant="top"
            />
            <LEDDisplay
              size="sm"
              text={app?.led_small_bottom ?? ""}
              variant="bottom"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded border border-gray-800 p-4 bg-gray-900 space-y-3">
            <div className="font-semibold">Day</div>
            <div className="text-2xl">Day {app?.day ?? 0}</div>
            <div className="font-semibold mt-4">Tokens</div>
            <div className="text-2xl">{app?.tokens ?? 0}</div>
          </div>

          <div className="lg:col-span-2 rounded border border-gray-800 p-4 bg-gray-900">
            <div className="font-semibold mb-3">Inventory</div>
            <ul className="space-y-2">
              {(inv ?? []).map((it) => (
                <li key={it.id} className="flex items-center gap-2">
                  <div className="flex-1 truncate">{it.item_name}</div>
                  <div className="w-16 text-right">{it.quantity}</div>
                </li>
              ))}
              {(!inv || inv.length === 0) && (
                <li className="text-sm text-gray-400">No items</li>
              )}
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}
