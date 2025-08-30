import { useEffect, useState } from "react"
import {
  useAppState,
  useUpdateLEDMain,
  useUpdateLEDSmallTop,
  useUpdateLEDSmallBottom,
} from "../lib/hooks"
import { useToast } from "./Toast"

type Props = {
  text: string
  size?: "lg" | "sm"
  editable?: boolean
  variant?: "main" | "top" | "bottom"
}

export default function LEDDisplay({
  text,
  size = "sm",
  editable = false,
  variant = "main",
}: Props) {
  const { data } = useAppState()
  const [value, setValue] = useState(text)
  const [editing, setEditing] = useState(false)
  const updateMain = useUpdateLEDMain()
  const updateTop = useUpdateLEDSmallTop()
  const updateBottom = useUpdateLEDSmallBottom()
  const { show } = useToast()

  useEffect(() => {
    if (!data) return
    const v =
      variant === "main"
        ? data.led_main_text
        : variant === "top"
        ? data.led_small_top
        : data.led_small_bottom
    if (typeof v === "string") setValue(v)
  }, [
    data?.led_main_text,
    data?.led_small_top,
    data?.led_small_bottom,
    variant,
  ])

  const base =
    size === "lg" ? "text-3xl md:text-5xl px-4 py-6" : "text-lg px-3 py-3"

  return (
    <div
      className={`rounded border border-blue-800/40 bg-blue-900/10 ${base} led-text w-full ${
        editable ? "cursor-text" : ""
      }`}
      onDoubleClick={() => editable && setEditing(true)}
    >
      {editing ? (
        <input
          className="w-full bg-transparent outline-none min-w-0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            setEditing(false)
            if (variant === "main")
              updateMain.mutate(value, {
                onSuccess: () => show({ type: "success", message: "Updated" }),
                onError: () =>
                  show({
                    type: "error",
                    message: "Failed to update (queued if offline)",
                  }),
              })
            else if (variant === "top")
              updateTop.mutate(value, {
                onSuccess: () => show({ type: "success", message: "Updated" }),
                onError: () =>
                  show({
                    type: "error",
                    message: "Failed to update (queued if offline)",
                  }),
              })
            else
              updateBottom.mutate(value, {
                onSuccess: () => show({ type: "success", message: "Updated" }),
                onError: () =>
                  show({
                    type: "error",
                    message: "Failed to update (queued if offline)",
                  }),
              })
          }}
          autoFocus
        />
      ) : (
        <div>{value}</div>
      )}
    </div>
  )
}
