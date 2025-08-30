import { useEffect, useState } from "react"
import { useAppState, useAdvanceDay, useUpdateDay } from "../lib/hooks"
import Modal from "./Modal"
import { useToast } from "./Toast"

export default function DayController() {
  const { data } = useAppState()
  const [day, setDay] = useState<number>(data?.day ?? 1)
  const advance = useAdvanceDay()
  const updateDay = useUpdateDay()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [draftDay, setDraftDay] = useState<number>(day)
  const { show } = useToast()

  useEffect(() => {
    if (typeof data?.day === "number") setDay(data.day)
  }, [data?.day])

  return (
    <div className="rounded border border-gray-800 p-4 bg-gray-900">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Day</div>
        <div className="text-2xl">Day {day}</div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500"
          onClick={() => setConfirmOpen(true)}
        >
          Advance Day
        </button>
        <button
          className="px-3 py-1.5 rounded bg-gray-800"
          onClick={() => {
            setDraftDay(day)
            setEditOpen(true)
          }}
        >
          Edit
        </button>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Day Advancement"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-300">
            Advancing the day will decrement hunger and thirst by 1 (min -2) and
            reset action points to 2 for all players.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              className="px-3 py-1.5 rounded bg-gray-800"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1.5 rounded bg-blue-600"
              onClick={() => {
                setConfirmOpen(false)
                advance.mutate(undefined, {
                  onSuccess: () =>
                    show({ type: "success", message: "Day advanced" }),
                  onError: () =>
                    show({
                      type: "error",
                      message: "Failed to advance day (queued if offline)",
                    }),
                })
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Day"
      >
        <div className="space-y-3">
          <input
            type="number"
            className="w-full bg-gray-800 rounded px-2 py-1"
            value={draftDay}
            onChange={(e) => setDraftDay(Number(e.target.value || 0))}
          />
          <div className="flex gap-2 justify-end">
            <button
              className="px-3 py-1.5 rounded bg-gray-800"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1.5 rounded bg-blue-600"
              onClick={() => {
                setEditOpen(false)
                updateDay.mutate(draftDay, {
                  onSuccess: () =>
                    show({ type: "success", message: "Day set" }),
                  onError: () =>
                    show({
                      type: "error",
                      message: "Failed to set day (queued if offline)",
                    }),
                })
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
