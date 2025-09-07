import LEDDisplay from "../ui/LEDDisplay"
import {
  useAppState,
  useInventory,
  useActiveMaskImage,
  useMaskPointer,
  useUpdateMaskPointer,
} from "../lib/hooks"
import { useEffect, useRef, useState } from "react"

export default function Display() {
  const { data: app } = useAppState()
  const { data: inv } = useInventory()
  const { data: activeMask } = useActiveMaskImage()
  const { data: pointer } = useMaskPointer()
  const smoothRef = useRef<{ x: number; y: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const { mutate: updatePointer } = useUpdateMaskPointer()
  const geomRef = useRef<{
    dx: number
    dy: number
    dw: number
    dh: number
    rIw: number
    rIh: number
  } | null>(null)
  const commitLockUntilRef = useRef<number>(0)
  const toggleFullscreen = async () => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {})
    } else {
      await el.requestFullscreen().catch(() => {})
    }
  }
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])

  // Ensure we stop dragging if mouseup happens outside the canvas
  useEffect(() => {
    const up = () => {
      setDragging(false)
      setHover(null)
    }
    window.addEventListener("mouseup", up)
    return () => window.removeEventListener("mouseup", up)
  }, [])

  // Load active image
  useEffect(() => {
    if (!activeMask?.url) {
      setImg(null)
      return
    }
    const i = new Image()
    i.crossOrigin = "anonymous"
    i.onload = () => setImg(i)
    i.src = activeMask.url
  }, [activeMask?.url])

  // Render spotlight with occlusion
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    // Resize canvas to full width
    const resize = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      let targetW = vw
      let targetH = Math.max(300, Math.floor((vw * 9) / 16))
      if (img) {
        const iw = img.naturalWidth
        const ih = img.naturalHeight
        const portrait = ih > iw
        const rIw = portrait ? ih : iw
        const rIh = portrait ? iw : ih
        const scale = Math.min(vw / rIw, vh / rIh)
        targetW = Math.floor(rIw * scale)
        targetH = Math.floor(rIh * scale)
      }
      const dpr = window.devicePixelRatio || 1
      // CSS size
      canvas.style.width = `${targetW}px`
      canvas.style.height = `${targetH}px`
      // Backing store size
      canvas.width = Math.floor(targetW * dpr)
      canvas.height = Math.floor(targetH * dpr)
      // Normalize drawing space to CSS pixels
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw()
    }
    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const cw = canvas.width / dpr
      const ch = canvas.height / dpr
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, cw, ch)
      if (!img) return
      // Fit image into canvas preserving aspect ratio
      const iw = img.naturalWidth
      const ih = img.naturalHeight
      const portrait = ih > iw
      const rIw = portrait ? ih : iw
      const rIh = portrait ? iw : ih
      // Scale to fit within canvas bounds (contain)
      const scale = Math.min(cw / rIw, ch / rIh)
      const dw = Math.floor(rIw * scale)
      const dh = Math.floor(rIh * scale)
      const dx = Math.floor((cw - dw) / 2)
      const dy = Math.floor((ch - dh) / 2)
      geomRef.current = { dx, dy, dw, dh, rIw, rIh }
      // Draw mask to offscreen (rotate if portrait) and read pixels
      const off = document.createElement("canvas")
      off.width = dw
      off.height = dh
      const offCtx = off.getContext("2d", { willReadFrequently: true })!
      offCtx.save()
      if (portrait) {
        // rotate 90deg clockwise to render as landscape inside offscreen area
        offCtx.translate(dw, 0)
        offCtx.rotate(Math.PI / 2)
        offCtx.drawImage(img, 0, 0, iw, ih, 0, 0, dh, dw)
      } else {
        offCtx.drawImage(img, 0, 0, iw, ih, 0, 0, dw, dh)
      }
      offCtx.restore()
      const maskData = offCtx.getImageData(0, 0, dw, dh)

      // Wall detection config
      const WALL_LUMA_THRESHOLD = 16
      const WALL_THICKNESS_PX = 1 // consider walls as at least N pixels thick
      const isWallAt = (x: number, y: number): boolean => {
        for (let ny = -WALL_THICKNESS_PX; ny <= WALL_THICKNESS_PX; ny++) {
          const qy = y + ny
          if (qy < 0 || qy >= dh) continue
          for (let nx = -WALL_THICKNESS_PX; nx <= WALL_THICKNESS_PX; nx++) {
            const qx = x + nx
            if (qx < 0 || qx >= dw) continue
            const idx = (qy * dw + qx) * 4
            const rch = maskData.data[idx] ?? 0
            const gch = maskData.data[idx + 1] ?? 0
            const bch = maskData.data[idx + 2] ?? 0
            const luma = 0.2126 * rch + 0.7152 * gch + 0.0722 * bch
            if (luma < WALL_LUMA_THRESHOLD) return true
          }
        }
        return false
      }

      // Draw red stroke around the image bounds (always visible)
      ctx.save()
      ctx.strokeStyle = "#ff3131"
      ctx.lineWidth = 2
      ctx.strokeRect(dx + 1, dy + 1, Math.max(0, dw - 2), Math.max(0, dh - 2))
      ctx.restore()

      // Determine spotlight center
      let cx = hover ? hover.x - dx : undefined
      let cy = hover ? hover.y - dy : undefined
      if (pointer && !hover) {
        // Map image-space (0..rIw, 0..rIh) to canvas-space
        const targetX = dx + (Math.max(0, Math.min(rIw, pointer.x)) / rIw) * dw
        const targetY = dy + (Math.max(0, Math.min(rIh, pointer.y)) / rIh) * dh
        const now = Date.now()
        if (now < commitLockUntilRef.current) {
          smoothRef.current = { x: targetX, y: targetY }
          cx = targetX - dx
          cy = targetY - dy
        } else {
          const prev = smoothRef.current ?? { x: targetX, y: targetY }
          const alpha = 0.2
          const smoothed = {
            x: prev.x + (targetX - prev.x) * alpha,
            y: prev.y + (targetY - prev.y) * alpha,
          }
          smoothRef.current = smoothed
          cx = smoothed.x - dx
          cy = smoothed.y - dy
        }
      }
      if (cx === undefined || cy === undefined) return
      const radius = 50 // Spotlight radius
      // Cast rays
      const steps = 720
      const revealed: { x: number; y: number }[] = []
      for (let a = 0; a < steps; a++) {
        const theta = (a / steps) * Math.PI * 2
        const dirx = Math.cos(theta)
        const diry = Math.sin(theta)
        for (let r = 0; r <= radius; r++) {
          const px = Math.round(cx + dirx * r)
          const py = Math.round(cy + diry * r)
          if (px < 0 || py < 0 || px >= dw || py >= dh) break
          if (isWallAt(px, py)) break
          // Collect all pixels until a wall; ignore white/black classification for reveal color
          revealed.push({ x: px, y: py })
        }
      }
      // Build a binary alpha mask for revealed pixels
      const reveal = document.createElement("canvas")
      reveal.width = dw
      reveal.height = dh
      const rctx = reveal.getContext("2d")!
      const imageData = rctx.createImageData(dw, dh)
      for (const p of revealed) {
        const idx = (p.y * dw + p.x) * 4
        // Only alpha matters for the mask
        imageData.data[idx] = 0
        imageData.data[idx + 1] = 0
        imageData.data[idx + 2] = 0
        imageData.data[idx + 3] = 255
      }
      rctx.putImageData(imageData, 0, 0)
      // Composite original image with the reveal mask so we show real image colors
      ctx.save()
      ctx.translate(dx, dy)
      ctx.drawImage(off, 0, 0)
      ctx.globalCompositeOperation = "destination-in"
      ctx.drawImage(reveal, 0, 0)
      ctx.restore()
    }

    resize()
    const ro = new ResizeObserver(() => resize())
    ro.observe(document.body)
    window.addEventListener("resize", resize)

    // If pointer is driving the spotlight (no local hover), animate to keep smoothing responsive and react to realtime updates
    let rafId: number | null = null
    const maybeAnimate = () => {
      if (!hover) {
        draw()
        rafId = requestAnimationFrame(maybeAnimate)
      }
    }
    rafId = requestAnimationFrame(maybeAnimate)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", resize)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [img, hover, pointer])

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
          <div className="card-surface p-4 space-y-3 self-start">
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
              {(inv ?? []).map((it, index) => (
                <li
                  key={it.id}
                  className={`flex items-center gap-2 p-2 rounded ${
                    index % 2 === 0 ? "bg-white/10" : "bg-black/30"
                  }`}
                >
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

        {/* Canvas placed below all other elements, full width with 16:9 height and fullscreen toggle */}
        <section className="-mx-4">
          <div
            ref={containerRef}
            className="relative flex justify-center items-center"
          >
            <canvas
              ref={canvasRef}
              className="block bg-black"
              onMouseDown={(e) => {
                setDragging(true)
                const rect = (
                  e.target as HTMLCanvasElement
                ).getBoundingClientRect()
                setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top })
              }}
              onMouseMove={(e) => {
                if (!dragging) return
                const rect = (
                  e.target as HTMLCanvasElement
                ).getBoundingClientRect()
                setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top })
              }}
              onMouseUp={() => {
                const g = geomRef.current
                if (g && hover) {
                  const ix = Math.max(
                    0,
                    Math.min(g.rIw, (hover.x - g.dx) / (g.dw / g.rIw))
                  )
                  const iy = Math.max(
                    0,
                    Math.min(g.rIh, (hover.y - g.dy) / (g.dh / g.rIh))
                  )
                  updatePointer({ x: ix, y: iy })
                  const cx = g.dx + (ix / g.rIw) * g.dw
                  const cy = g.dy + (iy / g.rIh) * g.dh
                  smoothRef.current = { x: cx, y: cy }
                  commitLockUntilRef.current = Date.now() + 300
                }
                setDragging(false)
                setHover(null)
              }}
              onMouseLeave={() => {
                const g = geomRef.current
                if (g && hover) {
                  const ix = Math.max(
                    0,
                    Math.min(g.rIw, (hover.x - g.dx) / (g.dw / g.rIw))
                  )
                  const iy = Math.max(
                    0,
                    Math.min(g.rIh, (hover.y - g.dy) / (g.dh / g.rIh))
                  )
                  updatePointer({ x: ix, y: iy })
                  const cx = g.dx + (ix / g.rIw) * g.dw
                  const cy = g.dy + (iy / g.rIh) * g.dh
                  smoothRef.current = { x: cx, y: cy }
                  commitLockUntilRef.current = Date.now() + 300
                }
                setDragging(false)
                setHover(null)
              }}
            />
            <button
              className="btn btn-ghost absolute top-2 right-2"
              onClick={toggleFullscreen}
            >
              Plein écran
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
