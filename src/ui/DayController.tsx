import { useEffect, useState } from "react"
import { useAppState, useAdvanceDay } from "../lib/hooks"

export default function DayController() {
  const { data } = useAppState()
  const [day, setDay] = useState<number>(data?.day ?? 1)
  const advance = useAdvanceDay()

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
          onClick={() => advance.mutate()}
        >
          Advance Day
        </button>
      </div>
    </div>
  )
}
