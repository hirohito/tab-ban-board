/**
 * The fun parts, carried over from Tab Out: a synthesized "swoosh"
 * when tabs close (Web Audio, no sound files) and a confetti burst
 * (plain DOM particles, no libraries).
 */

/** Filtered noise sweep that descends in pitch, like air moving. */
export function playCloseSound(): void {
  try {
    const ctx = new AudioContext()
    const t = ctx.currentTime

    const duration = 0.25
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    // Noise with a natural envelope (quick attack, smooth decay)
    for (let i = 0; i < data.length; i++) {
      const pos = i / data.length
      const env = pos < 0.1 ? pos / 0.1 : Math.pow(1 - (pos - 0.1) / 0.9, 1.5)
      data[i] = (Math.random() * 2 - 1) * env
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer

    // Bandpass sweeping high→low creates the "swoosh" character
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 2.0
    filter.frequency.setValueAtTime(4000, t)
    filter.frequency.exponentialRampToValueAtTime(400, t + duration)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.15, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)

    source.connect(filter).connect(gain).connect(ctx.destination)
    source.start(t)

    setTimeout(() => ctx.close(), 500)
  } catch {
    // Audio not supported — fail silently
  }
}

/** Confetti burst from the given viewport coordinates. */
export function shootConfetti(x: number, y: number): void {
  // Tailwind-ish hues that read well on both light and dark backgrounds
  const colors = [
    '#f59e0b', '#fbbf24', // amber
    '#10b981', '#34d399', // emerald
    '#3b82f6', '#60a5fa', // blue
    '#f43f5e', '#fb7185', // rose
  ]

  const particleCount = 17

  for (let i = 0; i < particleCount; i++) {
    const el = document.createElement('div')

    const isCircle = Math.random() > 0.5
    const size = 5 + Math.random() * 6 // 5–11px
    const color = colors[Math.floor(Math.random() * colors.length)]

    el.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${isCircle ? '50%' : '2px'};
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      opacity: 1;
    `
    document.body.appendChild(el)

    // Physics: random angle and speed for the outward burst
    const angle = Math.random() * Math.PI * 2
    const speed = 60 + Math.random() * 120
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed - 80 // bias upward
    const gravity = 200

    const startTime = performance.now()
    const duration = 700 + Math.random() * 200 // 700–900ms

    function frame(now: number) {
      const elapsed = (now - startTime) / 1000
      const progress = elapsed / (duration / 1000)

      if (progress >= 1) {
        el.remove()
        return
      }

      const px = vx * elapsed
      const py = vy * elapsed + 0.5 * gravity * elapsed * elapsed

      el.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px)) rotate(${elapsed * 360}deg)`
      el.style.opacity = String(1 - progress)

      requestAnimationFrame(frame)
    }

    requestAnimationFrame(frame)
  }
}
