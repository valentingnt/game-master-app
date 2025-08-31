import { useEffect, useRef, useState } from "react"
import { useAppState } from "../lib/hooks"

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
  const [blinkIndex, setBlinkIndex] = useState<number | null>(null)
  const valueRef = useRef<string>(text)
  const field =
    variant === "main"
      ? "led_main_text"
      : variant === "top"
      ? "led_small_top"
      : "led_small_bottom"

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
    size === "lg"
      ? "text-4xl md:text-6xl lg:text-7xl px-12 py-16"
      : "text-xl md:text-2xl px-4 py-4"
  const align = variant === "main" ? "text-center text-balance" : ""

  useEffect(() => {
    const timeouts: number[] = []

    const pickBlinkIndex = () => {
      const chars = Array.from(valueRef.current || "")
      const candidates: number[] = []
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i]
        if (ch !== "\n" && ch !== "\t" && ch !== " ") candidates.push(i)
      }
      if (candidates.length === 0) return null
      const idx = Math.floor(Math.random() * candidates.length)
      return candidates[idx] ?? null
    }

    const schedule = () => {
      const delay = 5000 + Math.random() * (60000 - 5000)
      const t = window.setTimeout(() => {
        const idx = pickBlinkIndex()
        if (idx == null) {
          schedule()
          return
        }
        const repeats = Math.random() < 0.5 ? 2 : 3
        const onDur = 10 + Math.random() * 140
        const offDur = 10 + Math.random() * 140

        const doBlink = (n: number) => {
          setBlinkIndex(idx)
          const tOn = window.setTimeout(() => {
            setBlinkIndex(null)
            if (n > 1) {
              const tOff = window.setTimeout(() => doBlink(n - 1), offDur)
              timeouts.push(tOff)
            } else {
              schedule()
            }
          }, onDur)
          timeouts.push(tOn)
        }

        doBlink(repeats)
      }, delay)
      timeouts.push(t)
    }

    schedule()
    return () => {
      for (const id of timeouts) window.clearTimeout(id)
    }
  }, [])

  // Keep latest value in a ref so timers don't reset on text change
  useEffect(() => {
    valueRef.current = value
  }, [value])

  return (
    <div
      className={`led-panel ${base} led-text ${align} ${
        editable ? "cursor-text" : ""
      }`}
    >
      <div aria-label={value} className="whitespace-normal break-words">
        {Array.from(value || "").map((ch, i) => (
          <span
            key={i}
            className={`${
              i === blinkIndex ? "opacity-40" : ""
            } transition-opacity duration-100`}
          >
            {ch === " " ? (variant === "main" ? " " : "\u00A0") : ch}
          </span>
        ))}
      </div>
    </div>
  )
}
