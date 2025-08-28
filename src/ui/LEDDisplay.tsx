import { useEffect, useState } from "react"
import {
  useAppState,
  useUpdateLEDMain,
  useUpdateLEDSmallTop,
  useUpdateLEDSmallBottom,
} from "../lib/hooks"

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
      className={`rounded border border-blue-800/40 bg-blue-900/10 ${base} led-text`}
    >
      {editing ? (
        <input
          className="w-full bg-transparent outline-none"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            setEditing(false)
            if (variant === "main") updateMain.mutate(value)
            else if (variant === "top") updateTop.mutate(value)
            else updateBottom.mutate(value)
          }}
          autoFocus
        />
      ) : (
        <div onDoubleClick={() => editable && setEditing(true)}>{value}</div>
      )}
    </div>
  )
}
