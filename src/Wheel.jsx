import { useEffect, useImperativeHandle, useRef, forwardRef, useState } from 'react'

const TAU = Math.PI * 2

// Draws the wheel and handles the spin animation.
// `segments` is an array of { id, label, color }. Calls onResult(index) when a spin finishes.
const Wheel = forwardRef(function Wheel({ segments, onResult, duration = 4500 }, ref) {
  const canvasRef = useRef(null)
  const rotationRef = useRef(0)
  const rafRef = useRef(0)
  const [spinning, setSpinning] = useState(false)

  // Cumulative angles based on each segment's weight (amount).
  function weights() {
    const w = segments.map((s) => Math.max(0.0001, Number(s.amount) || 0))
    const total = w.reduce((a, b) => a + b, 0)
    let acc = 0
    // returns [{start, end, mid}] in radians for each segment
    return w.map((weight) => {
      const span = (weight / total) * TAU
      const start = acc
      acc += span
      return { start, end: acc, mid: start + span / 2 }
    })
  }

  useImperativeHandle(ref, () => ({
    spin() {
      if (spinning || segments.length === 0) return
      const arcs = weights()
      // Weighted winner pick.
      const w = segments.map((s) => Math.max(0.0001, Number(s.amount) || 0))
      const total = w.reduce((a, b) => a + b, 0)
      let r = Math.random() * total
      let winner = 0
      for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) { winner = i; break } }
      // Put the chosen segment centre under the pointer at the top (-PI/2).
      const targetBase = -Math.PI / 2 - arcs[winner].mid
      const current = rotationRef.current
      const turns = 5 + Math.floor(Math.random() * 3)
      // Normalise so we always rotate forward by `turns` full spins then settle.
      let delta = ((targetBase - current) % TAU + TAU) % TAU
      const target = current + turns * TAU + delta
      const start = current
      const t0 = performance.now()
      setSpinning(true)
      const easeOut = (t) => 1 - Math.pow(1 - t, 3)
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / duration)
        rotationRef.current = start + (target - start) * easeOut(p)
        draw()
        if (p < 1) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          setSpinning(false)
          onResult?.(winner)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    },
  }))

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = canvas.width
    const cx = size / 2
    const cy = size / 2
    const r = size / 2 - 6
    ctx.clearRect(0, 0, size, size)

    const n = segments.length
    if (n === 0) {
      ctx.fillStyle = '#1e2638'
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, TAU)
      ctx.fill()
      ctx.fillStyle = '#6b7689'
      ctx.font = `${Math.round(size * 0.045)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Добавьте лоты →', cx, cy)
      return
    }

    const arcs = weights()
    const rot = rotationRef.current
    for (let i = 0; i < n; i++) {
      const a0 = rot + arcs[i].start
      const a1 = rot + arcs[i].end
      const span = arcs[i].end - arcs[i].start
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, a0, a1)
      ctx.closePath()
      ctx.fillStyle = segments[i].color
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 1
      ctx.stroke()

      // label
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(a0 + span / 2)
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fff'
      const fs = Math.max(10, Math.min(22, span * r * 0.5 + 9))
      ctx.font = `600 ${fs}px system-ui, sans-serif`
      let label = segments[i].label
      const maxLen = Math.max(6, Math.round(span * 26))
      if (label.length > maxLen) label = label.slice(0, maxLen - 1) + '…'
      ctx.shadowColor = 'rgba(0,0,0,0.4)'
      ctx.shadowBlur = 3
      ctx.fillText(label, r - 14, 0)
      ctx.restore()
    }

    // hub
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.12, 0, TAU)
    ctx.fillStyle = '#0e1320'
    ctx.fill()
    ctx.strokeStyle = '#3a455f'
    ctx.lineWidth = 3
    ctx.stroke()
  }

  useEffect(() => { draw() }, [segments])
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  return (
    <div className="wheel-wrap">
      <div className="pointer" />
      <canvas ref={canvasRef} width={520} height={520} className="wheel-canvas" />
    </div>
  )
})

export default Wheel
