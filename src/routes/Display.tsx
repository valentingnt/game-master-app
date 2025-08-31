import LEDDisplay from "../ui/LEDDisplay"
import { useAppState, useInventory } from "../lib/hooks"

export default function Display() {
  const { data: app } = useAppState()
  const { data: inv } = useInventory()

  return (
    <div className="min-h-screen app-surface">
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
          <div className="card-surface p-4 space-y-3">
            <div className="display-title text-2xl">
              Jour <span className="font-mono">{app?.day ?? 0}</span>
            </div>
            <div className="display-title text-2xl mt-4">
              Tokens : <span className="font-mono">{app?.tokens ?? 0}</span>
            </div>
          </div>

          <div className="lg:col-span-2 card-surface p-4">
            <div className="display-title text-2xl mb-3">Inventaire</div>
            <ul className="space-y-2">
              {(inv ?? []).map((it) => (
                <li key={it.id} className="flex items-center gap-2">
                  <div className="flex-1 truncate text-xl">{it.item_name}</div>
                  <div className="w-16 text-right text-xl">{it.quantity}</div>
                </li>
              ))}
              {(!inv || inv.length === 0) && (
                <li className="text-sm muted">Pas d'items</li>
              )}
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}
