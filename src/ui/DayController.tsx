import { useEffect, useState } from "react"
import { useAppState, useAdvanceDay, useUpdateDay } from "../lib/hooks"
import Modal from "./Modal"
import { useToast } from "./Toast"

export default function DayController({
  showTitle = true,
}: { showTitle?: boolean } = {}) {
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
        {showTitle && <div className="display-title text-base">Jour</div>}
        {!showTitle && <div className="muted text-sm">Jour</div>}
        <div className="text-2xl">Jour {day}</div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          className="btn btn-primary"
          onClick={() => setConfirmOpen(true)}
        >
          Avancer le jour
        </button>
        <button
          className="btn"
          onClick={() => {
            setDraftDay(day)
            setEditOpen(true)
          }}
        >
          Modifier
        </button>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmation d'avancement de jour"
      >
        <div className="space-y-3">
          <p className="text-sm muted">
            Avancer le jour diminuera la faim et la soif de 1 (min -2) et
            réinitialisera les points d'action de tous les joueurs.
          </p>
          <div className="flex gap-2 justify-end">
            <button className="btn" onClick={() => setConfirmOpen(false)}>
              Annuler
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setConfirmOpen(false)
                advance.mutate(undefined, {
                  onSuccess: () =>
                    show({ type: "success", message: "Jour avancé" }),
                  onError: () =>
                    show({
                      type: "error",
                      message:
                        "Échec de l'avancement du jour (mis en file d'attente si hors ligne)",
                    }),
                })
              }}
            >
              Confirmer
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Modifier le jour"
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
              Annuler
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditOpen(false)
                updateDay.mutate(draftDay, {
                  onSuccess: () =>
                    show({ type: "success", message: "Jour défini" }),
                  onError: () =>
                    show({
                      type: "error",
                      message:
                        "Échec de la définition du jour (mis en file d'attente si hors ligne)",
                    }),
                })
              }}
            >
              Enregistrer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
