import {
  useInventory,
  useUpsertInventoryItem,
  useDeleteInventoryItem,
} from "../lib/hooks"
import { useState } from "react"
import Modal from "./Modal"
import { useToast } from "./Toast"

export default function InventoryList() {
  const { data: items } = useInventory()
  const upsert = useUpsertInventoryItem()
  const del = useDeleteInventoryItem()
  const [editId, setEditId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState("")
  const [draftQty, setDraftQty] = useState<number>(1)
  const { show } = useToast()

  const openEdit = (id: string) => {
    const target = (items ?? []).find((i) => i.id === id)
    if (!target) return
    setDraftName(target.item_name)
    setDraftQty(target.quantity)
    setEditId(id)
  }

  const addItem = () => {
    upsert.mutate({ item_name: "New Item", quantity: 1 })
  }

  const removeItem = (id: string) => del.mutate({ id })

  return (
    <div className="card-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="display-title text-base">Inventory</div>
        <button className="btn" onClick={addItem}>
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {(items ?? []).map((it) => (
          <li key={it.id} className="flex items-center gap-2">
            <div className="flex-1 truncate">{it.item_name}</div>
            <div className="w-16 text-right">{it.quantity}</div>
            <button className="btn" onClick={() => openEdit(it.id)}>
              Edit
            </button>
          </li>
        ))}
      </ul>

      <Modal
        open={!!editId}
        onClose={() => setEditId(null)}
        title="Edit Inventory Item"
      >
        <div className="space-y-3">
          <input
            className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
          />
          <input
            type="number"
            className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
            value={draftQty}
            onChange={(e) => setDraftQty(Number(e.target.value || 0))}
          />
          <div className="flex gap-2 justify-between">
            <button
              className="px-3 py-1.5 rounded bg-red-700"
              onClick={() => {
                if (!editId) return
                del.mutate(
                  { id: editId },
                  {
                    onSuccess: () =>
                      show({ type: "success", message: "Item removed" }),
                    onError: () =>
                      show({
                        type: "error",
                        message: "Failed to remove (queued if offline)",
                      }),
                  }
                )
                setEditId(null)
              }}
            >
              Remove
            </button>
            <button className="btn" onClick={() => setEditId(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!editId) return
                upsert.mutate(
                  { id: editId, item_name: draftName, quantity: draftQty },
                  {
                    onSuccess: () =>
                      show({ type: "success", message: "Item updated" }),
                    onError: () =>
                      show({
                        type: "error",
                        message: "Failed to update (queued if offline)",
                      }),
                  }
                )
                setEditId(null)
              }}
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
