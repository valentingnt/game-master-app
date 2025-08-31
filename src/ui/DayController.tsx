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
    <div className="card-surface p-4">
      <div className="flex items-center justify-between">
        <div className="display-title text-base">Day</div>
        <div className="text-2xl">Day {day}</div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          className="btn btn-primary"
          onClick={() => setConfirmOpen(true)}
        >
          Advance Day
        </button>
        <button
          className="btn"
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
          <p className="text-sm muted">
            Advancing the day will decrement hunger and thirst by 1 (min -2) and
            reset action points to 2 for all players.
          </p>
          <div className="flex gap-2 justify-end">
            <button className="btn" onClick={() => setConfirmOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
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
            className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
            value={draftDay}
            onChange={(e) => setDraftDay(Number(e.target.value || 0))}
          />
          <div className="flex gap-2 justify-end">
            <button className="btn" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
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
