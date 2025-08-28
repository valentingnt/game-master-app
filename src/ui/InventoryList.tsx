import {
  useInventory,
  useUpsertInventoryItem,
  useDeleteInventoryItem,
} from "../lib/hooks"

export default function InventoryList() {
  const { data: items } = useInventory()
  const upsert = useUpsertInventoryItem()
  const del = useDeleteInventoryItem()

  const updateItem = (
    id: string,
    updates: { item_name?: string; quantity?: number }
  ) => {
    const target = (items ?? []).find((i) => i.id === id)
    if (!target) return
    upsert.mutate({
      id,
      item_name: updates.item_name ?? target.item_name,
      quantity: updates.quantity ?? target.quantity,
    })
  }

  const addItem = () => {
    upsert.mutate({ item_name: "New Item", quantity: 1 })
  }

  const removeItem = (id: string) => del.mutate(id)

  return (
    <div className="rounded border border-gray-800 p-4 bg-gray-900">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Inventory</div>
        <button className="px-2 py-1 rounded bg-gray-800" onClick={addItem}>
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {(items ?? []).map((it) => (
          <li key={it.id} className="flex items-center gap-2">
            <input
              className="flex-1 bg-gray-800 rounded px-2 py-1"
              value={it.item_name}
              onChange={(e) => updateItem(it.id, { item_name: e.target.value })}
            />
            <input
              type="number"
              className="w-24 bg-gray-800 rounded px-2 py-1"
              value={it.quantity}
              onChange={(e) =>
                updateItem(it.id, { quantity: Number(e.target.value || 0) })
              }
            />
            <button
              className="px-2 py-1 rounded bg-red-600"
              onClick={() => removeItem(it.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
