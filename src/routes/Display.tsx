import LEDDisplay from "../ui/LEDDisplay"
import {
  useAppState,
  useInventory,
  useActiveMaskImage,
  useMaskPointer,
  useUpdateMaskPointer,
  usePlayers,
} from "../lib/hooks"
import { useEffect, useRef, useState } from "react"

export default function Display() {
  const { data: app } = useAppState()
  const { data: inv } = useInventory()
  const { data: activeMask } = useActiveMaskImage()
  const { data: pointer } = useMaskPointer()
  const { data: players } = usePlayers()
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

  const showMaskCanvas =
    !!activeMask?.url && (app?.mask_show_on_display ?? true)

  // Render spotlight with occlusion (or plain image when spotlight disabled)
  useEffect(() => {
    if (!showMaskCanvas) return
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
        const quarters = (((activeMask?.rotation_quarters ?? 0) % 4) + 4) % 4
        const odd = quarters % 2 !== 0
        const rIw = odd ? ih : iw
        const rIh = odd ? iw : ih
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
      // Fit image into canvas preserving aspect ratio considering rotation
      const iw = img.naturalWidth
      const ih = img.naturalHeight
      const quarters = (((activeMask?.rotation_quarters ?? 0) % 4) + 4) % 4
      const odd = quarters % 2 !== 0
      const rIw = odd ? ih : iw
      const rIh = odd ? iw : ih
      // Scale to fit within canvas bounds (contain)
      const scale = Math.min(cw / rIw, ch / rIh)
      const dw = Math.floor(rIw * scale)
      const dh = Math.floor(rIh * scale)
      const dx = Math.floor((cw - dw) / 2)
      const dy = Math.floor((ch - dh) / 2)
      geomRef.current = { dx, dy, dw, dh, rIw, rIh }
      // Draw mask to offscreen with rotation
      const off = document.createElement("canvas")
      off.width = dw
      off.height = dh
      const offCtx = off.getContext("2d", { willReadFrequently: true })!
      offCtx.save()
      // Apply 0/90/180/270 rotation
      if (quarters === 1) {
        offCtx.translate(dw, 0)
        offCtx.rotate(Math.PI / 2)
        offCtx.drawImage(img, 0, 0, iw, ih, 0, 0, dh, dw)
      } else if (quarters === 2) {
        offCtx.translate(dw, dh)
        offCtx.rotate(Math.PI)
        offCtx.drawImage(img, 0, 0, iw, ih, 0, 0, dw, dh)
      } else if (quarters === 3) {
        offCtx.translate(0, dh)
        offCtx.rotate(-Math.PI / 2)
        offCtx.drawImage(img, 0, 0, iw, ih, 0, 0, dh, dw)
      } else {
        offCtx.drawImage(img, 0, 0, iw, ih, 0, 0, dw, dh)
      }
      offCtx.restore()
      const maskData = offCtx.getImageData(0, 0, dw, dh)

      // Wall detection config
      const WALL_LUMA_THRESHOLD = 32
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

      // If spotlight disabled, draw the image plainly and return
      if (app && app.mask_spotlight_enabled === false) {
        ctx.drawImage(off, dx, dy)
        return
      }

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
  }, [
    img,
    hover,
    pointer,
    app?.mask_spotlight_enabled,
    activeMask?.rotate_90,
    activeMask?.rotation_quarters,
    showMaskCanvas,
  ])

  return (
    <div className="min-h-screen app-surface bg-grid">
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

        {/* Player Images Section */}
        <section className="py-4">
          <div className="flex justify-between w-full max-h-64 gap-4">
            {(players ?? [])
              .filter((player) => player.avatar_url)
              .map((player) => (
                <div
                  key={player.id}
                  className="flex flex-col items-center justify-between space-y-2 flex-1"
                >
                  <div className="relative w-full h-full">
                    <img
                      src={player.avatar_url ?? ""}
                      alt={`${player.first_name} ${player.last_name}`}
                      className={`w-full h-full object-contain rounded transition-all duration-1000 ${
                        player.is_dead
                          ? "grayscale animate-[fadeToGrayscale_1s_ease-out_forwards]"
                          : ""
                      }`}
                    />
                    {player.is_dead && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-16 h-16">
                          <div className="absolute top-1/2 left-1/2 w-full h-1 bg-red-500 transform -translate-x-1/2 -translate-y-1/2 rotate-45 origin-center animate-[drawLine1_1.5s_ease-out_forwards] scale-x-0"></div>
                          <div className="absolute top-1/2 left-1/2 w-full h-1 bg-red-500 transform -translate-x-1/2 -translate-y-1/2 -rotate-45 origin-center animate-[drawLine2_1.5s_ease-out_1.5s_forwards] scale-x-0"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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

        {/* Canvas only shown when an image is active and display is enabled */}
        {showMaskCanvas && (
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
                  setHover({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  })
                }}
                onMouseMove={(e) => {
                  if (!dragging) return
                  const rect = (
                    e.target as HTMLCanvasElement
                  ).getBoundingClientRect()
                  setHover({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  })
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
        )}
      </main>
    </div>
  )
}
