// ════════════════════════════════════════════════════════════════════
//  Timeline.jsx — Pantalla principal del universo Humanidad 101
//
//  FLUJO:
//    1. Se cargan cuadrantes y entradas de Firebase.
//    2. Se muestra el MENÚ con 3 columnas (una por cuadrante).
//    3. Al hacer click en una columna → se entra al QuadrantScreen.
//    4. Dentro del cuadrante: canvas + nodos + Reader.
//    5. Botón "← Volver al menú" para regresar.
// ════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import { db } from './firebase'
import { collection, getDocs } from 'firebase/firestore'
import { captureEvent, captureException } from './analytics'
import Reader from './Reader'

// ══════════════════════════════════════════════════════════════════
//  HOOK: useMediaQuery
// ══════════════════════════════════════════════════════════════════
function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )
  useEffect(() => {
    const media = window.matchMedia(query)
    const listener = () => setMatches(media.matches)
    listener()
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])
  return matches
}


// ══════════════════════════════════════════════════════════════════
//  ESTILOS GLOBALES
// ══════════════════════════════════════════════════════════════════
const _style = document.createElement('style')
_style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=Geist:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { overflow: hidden; background: #050505; cursor: default; }
  .h101-scroll::-webkit-scrollbar { display: none; }
  .h101-scroll { -ms-overflow-style: none; scrollbar-width: none; }

  @keyframes h-fadein    { from{opacity:0} to{opacity:1} }
  @keyframes h-slideup   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes h-shimmer   { 0%{background-position:200% center} 100%{background-position:-200% center} }
  @keyframes h-ring      { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(3);opacity:0} }
  @keyframes h-ring2     { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(2.2);opacity:0} }
  @keyframes h-float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes h-glow-pulse{ 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes h-scan      { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes h-dash      { to{stroke-dashoffset: -20} }
  @keyframes h-appear    {
    0%   { opacity:0; transform:scale(.92) translateY(12px); filter:blur(4px); }
    100% { opacity:1; transform:scale(1)   translateY(0);    filter:blur(0);   }
  }
  @keyframes h-nav-in    { from{opacity:0;transform:translateX(-50%) translateY(16px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
  @keyframes h-card-reveal { from{opacity:0;transform:translateY(8px) scale(0.97);filter:blur(2px)} to{opacity:1;transform:translateY(0) scale(1);filter:blur(0)} }
  @keyframes h-era-in    { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
  @keyframes h-line-grow { from{transform:scaleX(0)} to{transform:scaleX(1)} }

  /* Entrada al cuadrante desde el menú: fade + scale suave */
  @keyframes h-quadrant-in {
    0%   { opacity:0; transform:scale(.97); filter:blur(6px); }
    100% { opacity:1; transform:scale(1);   filter:blur(0);   }
  }
`
document.head.appendChild(_style)


// ══════════════════════════════════════════════════════════════════
//  TOKENS DE DISEÑO
// ══════════════════════════════════════════════════════════════════
const T = {
  bg:        '#050505',
  surface:   '#0d0d12',
  outline:   '#2a3540',
  onSurface: '#e8e4e3',
  onVariant: '#7a8fa0',
  dim:       '#1a2030',
  ff: {
    display: "'Sora', sans-serif",
    body:    "'Geist', sans-serif",
    mono:    "'JetBrains Mono', monospace",
  },
}


// ══════════════════════════════════════════════════════════════════
//  IDENTIDADES DE CUADRANTE (QM)
//  ══════════════════════════════════════════════════════════════════
const QM = {
  q1: {
    color:     '#F5C518',
    colorSoft: '#7a6000',
    name:      'El Origen',
    paint: (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h)
      const bg = ctx.createRadialGradient(w * .5, h * .5, 0, w * .5, h * .5, w * .85)
      bg.addColorStop(0, 'rgba(28,14,0,1)')
      bg.addColorStop(1, 'rgba(4,2,0,1)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      for (let r = 0; r < 4; r++) {
        const phase = (t * .0004 + r * .25) % 1
        const radius = phase * w * .45
        const alpha = (1 - phase) * .12
        ctx.beginPath()
        ctx.arc(w * .5, h * .5, radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255,180,0,${alpha})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      for (let i = 0; i < 220; i++) {
        const ang = (i / 220) * Math.PI * 2 + Math.sin(t * .001 + i * .4) * .5
        const orbitR = 30 + Math.pow(i % 11, 1.6) * 8 + Math.sin(t * .0004 + i) * .20
        const x = w * .5 + Math.cos(ang) * orbitR
        const y = h * .5 + Math.sin(ang) * orbitR * .5
        const r = .4 + (i % 4) * .5
        const a = .08 + .5 * Math.abs(Math.sin(t * .0007 + i * .6))
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        const hue = 28 + (i % 40) - 20
        ctx.fillStyle = `hsla(${hue},100%,${55 + i % 30}%,${a})`
        ctx.fill()
      }
      const core = ctx.createRadialGradient(
        w * .5, h * .5, 0,
        w * .5, h * .5, 80 + Math.sin(t * .0008) * 20
      )
      core.addColorStop(0, `rgba(255,220,80,${.18 + .06 * Math.sin(t * .001)})`)
      core.addColorStop(.3, 'rgba(255,100,0,0.06)')
      core.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = core
      ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < 250; i++) {
        const px = ((i * 139.7 + t * .012) % w + w) % w
        const py = ((i * 81.3 + t * .008) % h + h) % h
        const a = .03 + .07 * Math.abs(Math.sin(i * .7 + t * .0004))
        ctx.beginPath()
        ctx.arc(px, py, .5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,200,60,${a})`
        ctx.fill()
      }
    }
  },
  q13: {
    color:     '#00C8F0',
    colorSoft: '#004060',
    name:      'La Era Humana',
    paint: (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h)
      const bg = ctx.createRadialGradient(w*.5, h*.5, 0, w*.5, h*.5, w)
      bg.addColorStop(0, 'rgba(1,2,8,1)')
      bg.addColorStop(1, 'rgba(0,1,5,1)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < 520; i++) {
        const sx = (i * 173.7) % w
        const sy = (i * 97.3)  % h
        const blink = Math.sin(t * .00014 * (0.5 + (i % 9) * .07) + i * .41)
        const a = .05 + .35 * (blink * .5 + .5)
        const sizeRoll = i % 33
        const r = sizeRoll < 28 ? .22 + (i % 3) * .14
                : sizeRoll < 32 ? .65 + (i % 3) * .2
                :                 1.1 + (i % 2) * .25
        const xNorm = sx / w
        const shift = (xNorm - .5) * 28
        const sr = Math.max(0, Math.min(255, 190 + (i%30) - shift))
        const sg = Math.max(0, Math.min(255, 200 + (i%20)))
        const sb = Math.max(0, Math.min(255, 230 + (i%20) + shift))
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${sr},${sg},${sb},${a})`
        ctx.fill()
        if (sizeRoll === 32 && a > .25) {
          ctx.beginPath()
          ctx.arc(sx, sy, r * 3.2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${sr},${sg},${sb},${a * .05})`
          ctx.fill()
        }
      }
      const sunDrift  = (t * .000008) % .16
      const sunX      = w * (.22 - sunDrift)
      const sunY      = h * .38
      const sunHalo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 28)
      sunHalo.addColorStop(0, 'rgba(255,230,140,0.07)')
      sunHalo.addColorStop(.5, 'rgba(255,180,60,0.03)')
      sunHalo.addColorStop(1,  'rgba(0,0,0,0)')
      ctx.fillStyle = sunHalo
      ctx.fillRect(0, 0, w, h)
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 4)
      sunGlow.addColorStop(0, `rgba(255,245,200,${.7 + .1 * Math.sin(t * .0006)})`)
      sunGlow.addColorStop(.4, 'rgba(255,200,80,0.4)')
      sunGlow.addColorStop(1,  'rgba(0,0,0,0)')
      ctx.fillStyle = sunGlow
      ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < 60; i++) {
        const dx = (i * 317.4 + t * .003) % w
        const dy = (i * 211.7)              % h
        ctx.beginPath()
        ctx.arc(dx, dy, .2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(100,120,160,${.02 + .015 * Math.sin(i + t * .0002)})`
        ctx.fill()
      }
      const monoDrift = (t * .000004) % .12
      const mCX = w * (.68 + monoDrift)
      const mCY = h * .50
      const mW  = w * .045
      const mH  = h * .16
      const mRY = mW * .32
      const tilt = Math.sin(t * .00035) * .008
      ctx.save()
      ctx.translate(mCX, mCY)
      ctx.rotate(tilt)
      const bodyGrad = ctx.createLinearGradient(-mW, 0, mW, 0)
      bodyGrad.addColorStop(0,  'rgba(18,14,22,1)')
      bodyGrad.addColorStop(.3, 'rgba(6,4,10,1)')
      bodyGrad.addColorStop(.7, 'rgba(3,2,6,1)')
      bodyGrad.addColorStop(1,  'rgba(1,1,3,1)')
      ctx.fillStyle = bodyGrad
      ctx.fillRect(-mW, -mH, mW * 2, mH * 2)
      const capBotGrad = ctx.createRadialGradient(0, mH, 0, 0, mH, mW)
      capBotGrad.addColorStop(0,  'rgba(20,15,28,1)')
      capBotGrad.addColorStop(.6, 'rgba(8,5,14,1)')
      capBotGrad.addColorStop(1,  'rgba(2,1,4,1)')
      ctx.fillStyle = capBotGrad
      ctx.beginPath()
      ctx.ellipse(0, mH, mW, mRY, 0, 0, Math.PI * 2)
      ctx.fill()
      const capTopGrad = ctx.createRadialGradient(0, -mH, 0, 0, -mH, mW)
      capTopGrad.addColorStop(0,  'rgba(12,10,20,1)')
      capTopGrad.addColorStop(1,  'rgba(1,1,3,1)')
      ctx.fillStyle = capTopGrad
      ctx.beginPath()
      ctx.ellipse(0, -mH, mW, mRY, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(40,30,60,0.5)'
      ctx.lineWidth = .6
      ctx.strokeRect(-mW, -mH, mW * 2, mH * 2)
      ctx.strokeStyle = 'rgba(30,22,48,0.4)'
      ctx.lineWidth = .5
      ctx.beginPath()
      ctx.ellipse(0, mH,  mW, mRY, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(0, -mH, mW, mRY, 0, 0, Math.PI * 2)
      ctx.stroke()
      const bioPhase = Math.sin(t * .00022)
      const bioA     = .06 + .025 * bioPhase
      const bioGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, mW * .7)
      bioGrad.addColorStop(0,  `rgba(60,180,240,${bioA})`)
      bioGrad.addColorStop(.5, `rgba(30,100,180,${bioA * .5})`)
      bioGrad.addColorStop(1,  'rgba(0,0,0,0)')
      ctx.save()
      ctx.beginPath()
      ctx.rect(-mW, -mH, mW * 2, mH * 2)
      ctx.clip()
      ctx.fillStyle = bioGrad
      ctx.fillRect(-mW, -mH, mW * 2, mH * 2)
      ctx.restore()
      for (let line = 0; line < 4; line++) {
        const ly = -mH * .6 + line * mH * .4
        const lineA = (.015 + .008 * Math.sin(t * .00018 + line * 1.3)) * (1 - Math.abs(ly / mH) * .5)
        ctx.beginPath()
        ctx.moveTo(-mW, ly)
        ctx.lineTo(mW, ly)
        ctx.strokeStyle = `rgba(80,200,255,${lineA})`
        ctx.lineWidth = .6
        ctx.stroke()
      }
      ctx.restore()
      const trailX  = mCX - mW * 1.5
      const trailLen = w * .08
      const trail = ctx.createLinearGradient(trailX, mCY, trailX - trailLen, mCY)
      trail.addColorStop(0,  'rgba(40,120,180,0.025)')
      trail.addColorStop(.5, 'rgba(20,60,120,0.01)')
      trail.addColorStop(1,  'rgba(0,0,0,0)')
      ctx.save()
      ctx.beginPath()
      ctx.rect(trailX - trailLen, mCY - mH * .8, trailLen, mH * 1.6)
      ctx.fillStyle = trail
      ctx.fill()
      ctx.restore()
    }
  },
  q26: {
    color:     '#A076F9',
    colorSoft: '#3a0080',
    name:      'El Presente Cósmico',
    paint: (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h)
      const cx = w * .60
      const cy = h * .45
      for (let i = 0; i < 600; i++) {
        const sx = (i * 173.7) % w
        const sy = (i * 97.3) % h
        const sizeRoll = i % 20
        const r = sizeRoll < 16 ? 0.28 + (i % 4) * 0.12
                : sizeRoll < 19 ? 0.7  + (i % 3) * 0.18
                :                 1.2 + (i % 2) * 0.3
        const blink = Math.sin(t * .00018 * (0.6 + (i % 7) * .08) + i * .37)
        const a = .04 + .38 * (blink * .5 + .5)
        const colorRoll = i % 10
        let sr, sg, sb
        if      (colorRoll < 6) { sr = 200 + i%40; sg = 210 + i%35; sb = 255 }
        else if (colorRoll < 8) { sr = 255;         sg = 230 + i%20; sb = 180 + i%40 }
        else                    { sr = 190 + i%40;  sg = 160 + i%30; sb = 255 }
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${sr},${sg},${sb},${a})`
        ctx.fill()
        if (sizeRoll === 19 && a > .2) {
          ctx.beginPath()
          ctx.arc(sx, sy, r * 3.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${sr},${sg},${sb},${a * .06})`
          ctx.fill()
        }
      }
      const STRANDS = 500
      const poleOffset = h * 1
      for (let pole = 0; pole < 2; pole++) {
        const sign = pole === 0 ? -1 : 1
        for (let s = 0; s < STRANDS; s++) {
          const speed  = .0003 + s
          const phase  = ((t * speed + s * (1 / STRANDS) + pole * .5) % 1)
          const p = phase * phase * phase
          const q = 1 - p
          const spreadAngle = (s / STRANDS) * Math.PI * 1.2
          const spreadR     = 0
          const ox = cx + Math.cos(spreadAngle) * spreadR
          const oy = cy + sign * poleOffset
          const ctrlAngle = spreadAngle + sign * 8 * Math.PI
          const ctrlR     = spreadR * 2
          const bx = cx + Math.cos(ctrlAngle) * ctrlR
          const by = cy + sign * poleOffset * .3
          const x = q*q*ox + 2*q*p*bx + p*p*cx
          const y = q*q*oy + 2*q*p*by + p*p*cy
          const lineWidth = (1.4 - p * 1.1) * (0.6 + (s % 4) * .2)
          const fadeIn  = Math.min(1, p * 4)
          const fadeOut = p > .8 ? 1 - (p - .8) / .2 : 1
          const a = .08 + .35 * fadeIn * fadeOut
          const whiteness = Math.floor((1 - p) * 80)
          const r = 180 + whiteness, g = 160 + whiteness, b = 255
          ctx.beginPath()
          ctx.arc(x, y, lineWidth, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`
          ctx.fill()
        }
      }
      const rings = [
        { rx: 10,  opacity: 1,  width: 0.8 },
        { rx: 72,  opacity: .5,  width: 1.2 },
        { rx: 118, opacity: .7,  width: .8  },
        { rx: 168, opacity: .8,  width: .7  },
      ]
      rings.forEach(({ rx, opacity, width }, ring) => {
        const ry    = rx * .36
        const pulse = Math.sin(t * .022 + ring * .9) * (ring === 0 ? 2.5 : 1.2)
        const a     = opacity + .008 * Math.sin(t * .0003 + ring * .5)
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx + pulse, ry + pulse * .36, 0, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(148,100,255,${Math.max(0, a)})`
        ctx.lineWidth = width
        ctx.stroke()
      })
      const coreAlpha = .6 + .02 * Math.sin(t * .028)
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 58 + Math.sin(t * .00035) * 8)
      core.addColorStop(0, `rgba(170,120,255,${coreAlpha})`)
      core.addColorStop(.5, `rgba(100,60,200,${coreAlpha * .4})`)
      core.addColorStop(1,  'rgba(0,0,0,0)')
      ctx.fillStyle = core
      ctx.fillRect(0, 0, w, h)
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * .5)
      halo.addColorStop(0,  'rgba(80,40,160,0.025)')
      halo.addColorStop(.6, 'rgba(40,15,100,0.012)')
      halo.addColorStop(1,  'rgba(0,0,0,0)')
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, w, h)
    }
  }
}


// ══════════════════════════════════════════════════════════════════
//  CANVAS GENERATIVO
// ══════════════════════════════════════════════════════════════════
function CosmicCanvas({ quadrantId }) {
  const ref = useRef(null)
  const raf = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const meta = QM[quadrantId]
    if (!meta) return
    let t = 0
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const loop = () => {
      t += 1
      meta.paint(ctx, canvas.width, canvas.height, t)
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('resize', resize)
    }
  }, [quadrantId])
  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
      }}
    />
  )
}


// ══════════════════════════════════════════════════════════════════
//  OVERLAY DE SCANLINES
// ══════════════════════════════════════════════════════════════════
function Scanlines() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none',
      zIndex: 1,
      background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)',
    }} />
  )
}


// ══════════════════════════════════════════════════════════════════
//  NODO DE ENTRADA — Diseño "Holograma vertical"
//
//  ESTRUCTURA VISUAL:
//    1. Dot anclado sobre la línea del timeline (nunca se mueve)
//    2. Línea vertical que sale del dot (arriba o abajo según cardPosition)
//    3. Al final de la línea: el bloque de texto
//
//  CONTENIDO DEL BLOQUE DE TEXTO:
//    - Desktop: type + title + era (type y title solo en hover)
//    - Móvil: solo era (siempre visible)
//
//  ANCHO DEL BLOQUE:
//    - Desktop: 180px fijo (permite saltos de línea si el título es largo)
//    - Móvil: 100px fijo (compacto, evita desborde en pantallas de 320px)
//
//  ALINEACIÓN:
//    La línea y el bloque de texto se centran con translateX(-50%)
//    sobre el eje del dot, garantizando que compartan el mismo eje X.
// ══════════════════════════════════════════════════════════════════

const DEFAULT_CARD_POSITION = 'above'

function Node({ entry, color, index, onClick, isMobile }) {
  const [hovered, setHovered] = useState(false)

  // Posición horizontal del nodo como % del ancho del track.
  const xPct = 8 + entry.timePosition * 82

  // Posición de la tarjeta (arriba o abajo del timeline).
  const cardPosition = entry.cardPosition === 'below' ? 'below' : DEFAULT_CARD_POSITION
  const cardBelow    = cardPosition === 'below'

  // ── Longitud de la línea vertical ──
  // En móvil: 20px fija.
  // En desktop: 30px en reposo, 45px en hover.
  const lineHeight = isMobile
    ? 20
    : (hovered ? 45 : 30)

  // ── Mostrar type + title ──
  // Desktop: solo en hover.
  // Móvil: NUNCA (solo se muestra era).
  const showDetails = !isMobile && hovered

  // ── Ancho fijo del bloque de texto ──
  // Fijo para que los saltos de línea funcionen y no se desborde en móvil.
  // 100px es lo suficientemente ancho para el era, pero pequeño para no
  // desbordar la pantalla en dispositivos de 320px.
  const blockWidth = isMobile ? 100 : 180

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: `${xPct}%`,
        top: '50%',
        transform: 'translate(-50%, -50%)',
        cursor: 'pointer',
        zIndex: 10,
        animation: `h-slideup .5s ${index * .12}s ease both`,
        width: 0,
        height: 0,
      }}
    >

      {/* ═══════════════════════════════════════════════════════
          DOT — ancla visual sobre la línea del timeline.
      ═══════════════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: 'translate(-50%, -50%)',
      }}>
        {/* Anillo pulsante — permanente */}
        <div style={{
          position: 'absolute',
          inset: -2,
          borderRadius: '50%',
          border: `1px solid ${color}`,
          animation: 'h-ring 2.4s ease-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Dot visible */}
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: hovered ? color : 'rgba(20,20,30,0.9)',
          border: `2px solid ${color}`,
          boxShadow: `0 0 8px ${color}80`,
          transition: 'background .2s ease',
          pointerEvents: 'none',
        }} />

        {/* HITBOX invisible — área clicable alrededor del dot */}
        <div style={{
          position: 'absolute',
          inset: -15,
          borderRadius: '50%',
          cursor: 'pointer',
        }} />
      </div>
      

      {/* ═══════════════════════════════════════════════════════
          LÍNEA VERTICAL — centrada exactamente sobre el dot.
          Elemento independiente del bloque de texto para
          garantizar que comparten el mismo eje X.
      ═══════════════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute',
        left: 0,
        ...(cardBelow ? { top: 0 } : { bottom: 0 }),
        width: 1,
        height: lineHeight,
        transform: 'translateX(-50%)',
        background: `linear-gradient(to ${cardBelow ? 'bottom' : 'top'}, ${color}, ${color}30)`,
        transition: 'height .35s cubic-bezier(.4,0,.2,1)',
        pointerEvents: 'none',
      }} />

      {/* ═══════════════════════════════════════════════════════
          BLOQUE DE TEXTO — ancho fijo, centrado sobre la línea.
          Los textos largos saltan de línea dentro del bloque.
      ═══════════════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute',
        left: 0,
        ...(cardBelow
          ? { top: lineHeight + 4 }      // debajo de la línea
          : { bottom: lineHeight + 4 }), // encima de la línea
        width: blockWidth,               // ← ancho fijo para forzar saltos
        transform: 'translateX(-50%)',   // centra el bloque sobre el eje del dot
        display: 'flex',
        flexDirection: cardBelow ? 'column' : 'column-reverse',
        alignItems: 'center',
        gap: 4,
        textAlign: 'center',
        opacity: 1,                      // siempre visible (era)
        pointerEvents: showDetails ? 'auto' : 'none',
      }}>

        {/* ── entry.type ──
            Solo visible en desktop con hover. Oculto en móvil. */}
        {showDetails && (
          <div style={{
            fontFamily: T.ff.mono,
            fontSize: 9,
            color: '#ffffff',
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            textShadow: '0 2px 8px rgba(0,0,0,0.9)',
            animation: 'h-fadein .25s ease both',
            maxWidth: '100%',              // no desborda el bloque
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {entry.type}
          </div>
        )}

        {/* ── entry.title ──
            Solo visible en desktop con hover. Oculto en móvil.
            Con saltos de línea gracias al ancho fijo del bloque. */}
        {showDetails && (
          <div style={{
            fontFamily: T.ff.display,
            fontSize: 13,
            fontWeight: 600,
            color: '#ffffff',
            lineHeight: 2,
            textShadow: '0 2px 8px rgba(0,0,0,0.9)',
            animation: 'h-fadein .28s .04s ease both',
            maxWidth: '100%',
            wordBreak: 'break-word',       // rompe palabras muy largas si es necesario
          }}>
            {entry.title}
          </div>
        )}

        {/* ── entry.era — SIEMPRE VISIBLE ──
            Único texto en móvil. También visible en desktop. */}
        <div style={{
          fontFamily: T.ff.mono,
          fontSize: isMobile ? 9 : 10,
          color: '#ffffff',
          letterSpacing: '.1em',
          textShadow: '0 2px 8px rgba(0,0,0,0.9)',
          maxWidth: '100%',
          wordBreak: 'break-word',
          lineHeight: 1.3,
        }}>
          {entry.era}
        </div>

      </div>

    </div>
  )
}



// ══════════════════════════════════════════════════════════════════
//  PANTALLA DE CARGA
// ══════════════════════════════════════════════════════════════════
function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: T.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24,
    }}>
      <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 8 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute',
            inset: i * 10,
            borderRadius: '50%',
            border: `1px solid rgba(0,200,240,${.5 - i * .15})`,
            animation: `h-ring ${1.5 + i * .5}s ${i * .2}s ease-out infinite`,
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: 28,
          borderRadius: '50%',
          background: '#00C8F0',
          boxShadow: '0 0 20px #00C8F0',
        }} />
      </div>
      <div style={{
        fontFamily: T.ff.display,
        fontSize: 'clamp(1.6rem,4vw,2.8rem)',
        fontWeight: 800, color: '#fff',
        letterSpacing: '.03em',
        animation: 'h-fadein 1.2s ease',
      }}>
        Humanidad <span style={{ color: '#00C8F0', textShadow: '0 0 40px #00C8F080' }}>101</span>
      </div>
      <div style={{
        fontFamily: T.ff.mono, fontSize: 11,
        color: T.onVariant,
        letterSpacing: '.22em', textTransform: 'uppercase',
        animation: 'h-fadein 1.5s .4s ease both',
      }}>
        Accediendo al universo
      </div>
      <div style={{
        width: 180, height: 1,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 1,
        animation: 'h-fadein 1s .6s ease both',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg,transparent,#00C8F0,transparent)',
          backgroundSize: '200% 100%',
          animation: 'h-shimmer 1.4s linear infinite',
        }} />
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════
//  MENÚ DE CUADRANTES — Pantalla de selección
//
//  DISEÑO:
//    - Fondo negro absoluto.
//    - Tres columnas iguales (una por cuadrante).
//    - Línea blanca horizontal a media altura, cruzando toda la pantalla.
//    - Cada columna es clickable en toda su área.
//    - Hover: la columna se tiñe con el color del cuadrante y la línea
//      blanca brilla en la sección correspondiente.
//
//  LAYOUT:
//    - Desktop: 3 columnas lado a lado.
//    - Móvil: 3 filas apiladas verticalmente (cada cuadro ocupa 1/3 del alto).
//
//  RESPONSIVE:
//    - Se adapta a móvil, tablet y desktop.
//    - El tamaño de las tipografías se ajusta con clamp().
// ══════════════════════════════════════════════════════════════════

function QuadrantMenu({ quadrants, onSelectQuadrant, isMobile }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: '#000000',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      overflow: 'hidden',
      animation: 'h-fadein .5s ease both',
    }}>

      {quadrants.map((q, i) => {
        const meta = QM[q.id] || QM.q1
        const color = meta.color
        const isHovered = hoveredIndex === i

        // La línea blanca horizontal se coloca entre el número y la info
        // Solo aplica en desktop. En móvil es una línea horizontal entre filas.
        const isLast = i === quadrants.length - 1

        return (
          <button
            key={q.id}
            onClick={() => onSelectQuadrant(i)}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              flex: 1,
              position: 'relative',
              background: isHovered ? `${color}0a` : 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: isMobile ? '40px 24px' : '56px 40px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: isMobile ? 'flex-start' : 'center',
              textAlign: isMobile ? 'left' : 'center',
              transition: 'background .35s ease',
              overflow: 'hidden',
              // Separador entre columnas (desktop) o filas (móvil)
              ...(isMobile
                ? (!isLast && {
                    borderBottom: `1px solid rgba(255,255,255,${isHovered ? 0.25 : 0.12})`,
                    transition: 'background .35s ease, border-color .35s ease',
                  })
                : (!isLast && {
                    borderRight: `1px solid rgba(255,255,255,${isHovered ? 0.25 : 0.12})`,
                    transition: 'background .35s ease, border-color .35s ease',
                  })),
            }}
          >

            {/* ── Línea blanca horizontal (solo desktop) ──
                Cruza la columna a media altura, separando el número
                (arriba) de la info del cuadrante (abajo). */}
            {!isMobile && (
              <div style={{
                position: 'absolute',
                left: '20%',
                right: '20%',
                top: '50%',
                height: 1,
                background: isHovered
                  ? `linear-gradient(to right, transparent, ${color}, transparent)`
                  : 'linear-gradient(to right, transparent, rgba(255,255,255,0.35), transparent)',
                boxShadow: isHovered ? `0 0 12px ${color}60` : 'none',
                transition: 'all .35s ease',
                pointerEvents: 'none',
              }} />
            )}

            {/* ── Número gigante translúcido (fondo) ──
                Está detrás de todo el contenido de la columna. */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontFamily: T.ff.display,
              fontSize: isMobile ? 'clamp(4rem, 22vw, 8rem)' : 'clamp(6rem, 12vw, 14rem)',
              fontWeight: 800,
              color: isHovered ? `${color}18` : 'rgba(255,255,255,0.04)',
              lineHeight: 1,
              letterSpacing: '-.04em',
              userSelect: 'none',
              pointerEvents: 'none',
              transition: 'color .35s ease',
            }}>
              0{q.number}
            </div>

            {/* ── CONTENIDO ──
                Distribución vertical:
                  Desktop: [número visible] [espacio] [línea] [info] [ENTRAR]
                  Móvil: [info] [ENTRAR]  (número es decorativo de fondo)
            */}

            {/* Eyebrow: "ERA X · NOMBRE_ERA" */}
            <div style={{
              position: 'relative',
              zIndex: 1,
              fontFamily: T.ff.mono,
              fontSize: isMobile ? 10 : 11,
              color: isHovered ? color : `${color}90`,
              letterSpacing: '.28em',
              textTransform: 'uppercase',
              marginBottom: isMobile ? 12 : 16,
              transition: 'color .35s ease',
            }}>
              Era {q.number} · {q.era || meta.name}
            </div>

            {/* Título: nombre del cuadrante */}
            <h2 style={{
              position: 'relative',
              zIndex: 1,
              fontFamily: T.ff.display,
              fontSize: isMobile ? 'clamp(1.6rem, 8vw, 2.4rem)' : 'clamp(1.8rem, 2.8vw, 2.6rem)',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.05,
              marginBottom: isMobile ? 12 : 20,
              letterSpacing: '-.01em',
              textShadow: isHovered ? `0 0 40px ${color}60` : 'none',
              transition: 'text-shadow .35s ease',
            }}>
              {q.name}
            </h2>

            {/* Descripción breve del cuadrante */}
            {q.description && (
              <p style={{
                position: 'relative',
                zIndex: 1,
                fontFamily: T.ff.body,
                fontSize: isMobile ? 12 : 13,
                color: T.onVariant,
                lineHeight: 1.65,
                maxWidth: isMobile ? '100%' : 280,
                marginBottom: isMobile ? 20 : 32,
                opacity: isHovered ? 1 : 0.7,
                transition: 'opacity .35s ease',
              }}>
                {q.description}
              </p>
            )}

            {/* Indicador "ENTRAR →" */}
            <div style={{
              position: 'relative',
              zIndex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              fontFamily: T.ff.mono,
              fontSize: isMobile ? 10 : 11,
              color: isHovered ? color : `${color}80`,
              letterSpacing: '.24em',
              textTransform: 'uppercase',
              padding: isMobile ? '10px 0' : '10px 20px',
              border: isMobile
                ? 'none'
                : `1px solid ${isHovered ? color + '60' : color + '25'}`,
              borderRadius: 999,
              transition: 'all .35s ease',
              boxShadow: isHovered && !isMobile ? `0 0 24px ${color}30` : 'none',
            }}>
              <span>Entrar</span>
              <span style={{
                transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                transition: 'transform .35s ease',
              }}>→</span>
            </div>

          </button>
        )
      })}
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════
//  BOTÓN DE FLECHA (NAVEGACIÓN LATERAL dentro del cuadrante)
// ══════════════════════════════════════════════════════════════════
function ArrowBtn({ dir, color, onClick }) {
  const [hov, setHov] = useState(false)
  const isLeft = dir === 'left'
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'fixed', top: '50%',
        [isLeft ? 'left' : 'right']: 20,
        transform: 'translateY(-50%)',
        zIndex: 50,
        width: 44, height: 44,
        borderRadius: '50%',
        background: hov ? `${color}18` : 'rgba(8,10,18,0.6)',
        border: `1px solid ${hov ? color + '60' : 'rgba(255,255,255,0.08)'}`,
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .25s ease',
        boxShadow: hov ? `0 0 20px ${color}30` : 'none',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d={isLeft ? 'M10 3L5 8L10 13' : 'M6 3L11 8L6 13'}
          stroke={hov ? color : T.onVariant}
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: 'stroke .2s' }}
        />
      </svg>
    </button>
  )
}


// ══════════════════════════════════════════════════════════════════
//  PANTALLA DE CUADRANTE
// ══════════════════════════════════════════════════════════════════
function QuadrantScreen({ quadrant, entries, isActive, onSelectEntry, isMobile }) {
  const meta     = QM[quadrant.id] || QM.q1
  const color    = meta.color
  const qEntries = entries.filter(e => e.quadrantId === quadrant.id)

  if (!isActive) return null

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <CosmicCanvas quadrantId={quadrant.id} />
      <Scanlines />
      <div style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
        background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(5,5,5,0.75) 100%)',
      }} />

      <div style={{
        position: 'absolute',
        top: isMobile ? 60 : 80,
        right: isMobile ? 20 : 100,
        left: isMobile ? 20 : 'auto',
        zIndex: 20,
        animation: 'h-era-in .6s ease both',
      }}>
        <div style={{
          fontFamily: T.ff.mono, fontSize: 10,
          color: `${color}60`,
          letterSpacing: '.28em',
          textTransform: 'uppercase', marginBottom: 10,
        }}>
          Era {quadrant.number} · {quadrant.era || meta.name}
        </div>
        <h2 style={{
          fontFamily: T.ff.display,
          fontSize: isMobile ? 'clamp(1.4rem,6vw,2rem)' : 'clamp(2rem,4.5vw,3.5rem)',
          fontWeight: 800, color: '#fff',
          lineHeight: 1,
          textShadow: `0 0 60px ${color}40, 0 2px 40px rgba(0,0,0,.8)`,
          letterSpacing: '-.001em',
          marginBottom: 12,
        }}>
          {quadrant.name}
        </h2>
        <div style={{
          width: 60, height: 1, borderRadius: 1,
          background: `linear-gradient(to right,${color},transparent)`,
          boxShadow: `0 0 8px ${color}`,
        }} />
      </div>

      <div style={{
        position: 'absolute',
        bottom: isMobile ? 90 : 150,
        left: isMobile ? 20 : 60,
        right: isMobile ? 20 : 'auto',
        maxWidth: isMobile ? 'calc(100% - 40px)' : 340,
        zIndex: 20,
        animation: 'h-slideup .7s .15s ease both',
      }}>
        <p style={{
          fontFamily: T.ff.body,
          fontSize: isMobile ? 12 : 13,
          color: T.onVariant,
          lineHeight: isMobile ? 1.6 : 1.75,
        }}>
          {quadrant.description}
        </p>
      </div>

      <div style={{
        position: 'absolute', right: isMobile ? 16 : 48, top: '50%',
        transform: 'translateY(-60%)',
        fontFamily: T.ff.display,
        fontSize: isMobile ? 'clamp(4rem,22vw,7rem)' : 'clamp(8rem,18vw,16rem)',
        fontWeight: 800, lineHeight: 1,
        color: isMobile ? `${color}03` : `${color}05`,
        userSelect: 'none', pointerEvents: 'none',
        zIndex: 1,
        letterSpacing: '-.04em',
      }}>
        0{quadrant.number}
      </div>

      <div style={{
        position: 'absolute', left: 0,
        right: 0, top: '50%',
        height: 320,
        transform: 'translateY(-50%)',
        zIndex: 8,
      }}>
        <div style={{
          position: 'absolute',
          left: isMobile ? '8%' : '12%',
          right: isMobile ? '8%' : '15%',
          top: '50%',
          height: 10,
          transform: 'translateY(-50%)',
          background: `linear-gradient(to right,transparent,${color}30 12%,${color}50 50%,${color}30 88%,transparent)`,
        }} />

        <div style={{
          position: 'absolute', 
          left: isMobile ? '3%': '6%', 
          top: isMobile ? '60%': '50%',
          transform: 'translateY(-120%)',
          fontFamily: T.ff.mono, fontSize: 11,
          color: `${color}80`,
          letterSpacing: '.14em', fontWeight: 500,
          paddingRight: 12,
          pointerEvents: 'none',
          zIndex: 5,
          whiteSpace: 'wrap',
          maxWidth: isMobile ? 80 : 'none', 
          overflow: 'hidden',
          textOverflow: 'ellipsis', 
          }}>
          {quadrant.startBillion === 0 ? 'Año 0' : `${quadrant.startBillion}`}
        </div>

        <div style={{
          
          position: 'absolute', 
          right: isMobile ? '8%' : '8%', 
          top: isMobile ? '60%' : '50%',
          transform: 'translateY(-120%)',
          fontFamily: T.ff.mono, fontSize: 11,
          color: `${color}80`,
          letterSpacing: '.14em', fontWeight: 500,
          paddingLeft: 12,
          pointerEvents: 'none',
          zIndex: 5,
          whiteSpace: 'wrap',
          maxWidth: isMobile ? 80 : 'none', 
          overflow: 'hidden',
          textOverflow: 'ellipsis', 
        }}>
          {quadrant.endBillion}
        </div>

        {[.2, .4, .6, .8].map(pos => (
          <div key={pos} style={{
            position: 'absolute',
            left: `${6 + pos * 88}%`,
            top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 0.25, height: 8,
            background: `${color}35`,
            pointerEvents: 'none',
          }} />
        ))}

        {qEntries.map((entry, i) => (
          <Node
            key={entry.id}
            entry={entry}
            color={color}
            index={i}
            onClick={() => onSelectEntry(entry)}
            isMobile={isMobile}
          />
        ))}

        {qEntries.length === 0 && (
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%,-50%)',
            fontFamily: T.ff.mono, fontSize: 11,
            color: `${color}30`,
            letterSpacing: '.18em',
          }}>
            VACÍO · PRÓXIMAMENTE
          </div>
        )}
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════
//  COMPONENTE RAÍZ — TIMELINE
//
//  Ahora maneja DOS VISTAS:
//    - 'menu':     pantalla de selección con 3 columnas.
//    - 'quadrant': cuadrante activo con su canvas y nodos.
//
//  La navegación entre vistas se hace con setView().
//  Al seleccionar un cuadrante, se guarda su índice y se cambia a 'quadrant'.
//  Al pulsar "Volver al menú", se vuelve a 'menu'.
// ══════════════════════════════════════════════════════════════════

export default function Timeline({ onExit }) {
  const [quadrants,     setQuadrants]     = useState([])
  const [entries,       setEntries]       = useState([])
  const [loaded,        setLoaded]        = useState(false)
  const [view,          setView]          = useState('menu')   // 'menu' | 'quadrant'
  const [currentQ,      setCurrentQ]      = useState(0)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const previousQuadrantRef = useRef(0)

  const isMobile = useMediaQuery('(max-width: 640px)')
  const isTablet = useMediaQuery('(max-width: 1023px)')

  // ── Carga inicial de Firebase ─────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [qSnap, eSnap] = await Promise.all([
          getDocs(collection(db, 'quadrants')),
          getDocs(collection(db, 'entries')),
        ])
        const allEntries = eSnap.docs.map(d => d.data())
        setEntries(allEntries)
        const allQuadrants = qSnap.docs.map(d => d.data()).sort((a, b) => a.number - b.number)
        const filteredQuadrants = allQuadrants.filter(q =>
          allEntries.some(e => e.quadrantId === q.id)
        )
        setQuadrants(filteredQuadrants)
        setLoaded(true)
      } catch (error) {
        captureException(error, { operation: 'load_timeline_data' })
        console.error('Unable to load timeline data', error)
      }
    }
    load()
  }, [])

  // ── Analytics: cambio de cuadrante ────────────────────────────
  useEffect(() => {
    if (!loaded || previousQuadrantRef.current === currentQ) return
    const quadrant = quadrants[currentQ]
    captureEvent('quadrant_changed', {
      quadrant_id: quadrant?.id,
      quadrant_number: quadrant?.number,
    })
    previousQuadrantRef.current = currentQ
  }, [currentQ, loaded, quadrants])

  const handleSelectEntry = entry => {
    captureEvent('entry_opened', {
      entry_id: entry.id,
      entry_type: entry.type,
      quadrant_id: entry.quadrantId,
    })
    setSelectedEntry(entry)
  }

  // ── Selección desde el menú ───────────────────────────────────
  const handleSelectQuadrant = (i) => {
    const quadrant = quadrants[i]
    captureEvent('quadrant_selected_from_menu', {
      quadrant_id: quadrant?.id,
      quadrant_number: quadrant?.number,
    })
    setCurrentQ(i)
    setView('quadrant')
  }

  // ── Volver al menú ────────────────────────────────────────────
  const handleBackToMenu = () => {
    setView('menu')
    setSelectedEntry(null)
  }

  // ── Navegación por teclado dentro del cuadrante ───────────────
  useEffect(() => {
    if (!loaded || view !== 'quadrant') return
    const onKey = e => {
      if (selectedEntry) return
      if (e.key === 'ArrowRight') setCurrentQ(q => Math.min(q + 1, quadrants.length - 1))
      if (e.key === 'ArrowLeft')  setCurrentQ(q => Math.max(q - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loaded, view, quadrants.length, selectedEntry])

  // ── Navegación por scroll dentro del cuadrante ────────────────
  useEffect(() => {
    if (!loaded || selectedEntry || view !== 'quadrant') return
    const onWheel = e => {
      if (e.deltaY > 50)       setCurrentQ(q => Math.min(q + 1, quadrants.length - 1))
      else if (e.deltaY < -50) setCurrentQ(q => Math.max(q - 1, 0))
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [loaded, selectedEntry, view, quadrants.length])

  // ── Navegación por swipe (móvil, dentro del cuadrante) ────────
  useEffect(() => {
    if (!loaded || !isMobile || selectedEntry || view !== 'quadrant') return
    let startX = 0, startY = 0
    const onTouchStart = e => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }
    const onTouchEnd = e => {
      const dx = e.changedTouches[0].clientX - startX
      const dy = e.changedTouches[0].clientY - startY
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) setCurrentQ(q => Math.min(q + 1, quadrants.length - 1))
        else        setCurrentQ(q => Math.max(q - 1, 0))
      }
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [loaded, isMobile, selectedEntry, view, quadrants.length])

  if (!loaded) return <LoadingScreen />

  const meta = QM[quadrants[currentQ]?.id] || QM.q1

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: T.bg,
      overflow: 'hidden',
      fontFamily: T.ff.body,
    }}>

      {/* ══════════════════════════════════════════════════════════
          VISTA 1: MENÚ DE CUADRANTES
      ══════════════════════════════════════════════════════════ */}
      {view === 'menu' && (
        <QuadrantMenu
          quadrants={quadrants}
          onSelectQuadrant={handleSelectQuadrant}
          isMobile={isMobile}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          VISTA 2: CUADRANTE ACTIVO
          Envueltos en un contenedor con animación de entrada.
      ══════════════════════════════════════════════════════════ */}
      {view === 'quadrant' && (
        <div style={{
          position: 'absolute', inset: 0,
          animation: 'h-quadrant-in .5s ease both',
        }}>
          {quadrants.map((q, i) => (
            <QuadrantScreen
              key={q.id}
              quadrant={q}
              entries={entries}
              isActive={i === currentQ}
              onSelectEntry={handleSelectEntry}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          HEADER — Cambia según la vista
      ══════════════════════════════════════════════════════════ */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '12px 20px' : '18px 52px',
        background: 'linear-gradient(to bottom,rgba(5,5,5,0.85) 0%,transparent 100%)',
        pointerEvents: 'none',
      }}>

        {/* Logo */}
        <div style={{
          fontFamily: T.ff.display,
          fontSize: isMobile ? 13 : 17,
          fontWeight: 800,
          color: view === 'menu' ? '#ffffff' : meta.color,
          textShadow: view === 'menu' ? 'none' : `0 0 30px ${meta.color}50`,
          letterSpacing: '.04em',
          pointerEvents: 'auto',
          transition: 'color .3s ease',
        }}>
          Humanidad <span style={{ color: '#fff' }}>101</span>
        </div>

        {/* Botones de la derecha: dependen de la vista */}
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>

          {/* Botón "Volver al menú" — solo en la vista de cuadrante */}
          {view === 'quadrant' && (
            <button
              onClick={handleBackToMenu}
              style={{
                fontFamily: T.ff.mono,
                fontSize: isMobile ? 9 : 10,
                color: meta.color,
                background: 'transparent',
                border: `1px solid ${meta.color}30`,
                borderRadius: 6,
                padding: isMobile ? '4px 12px' : '6px 16px',
                cursor: 'pointer',
                transition: 'all .25s ease',
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${meta.color}15`
                e.currentTarget.style.borderColor = meta.color
                e.currentTarget.style.boxShadow = `0 0 20px ${meta.color}30`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = `${meta.color}30`
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <span style={{ fontSize: isMobile ? 12 : 14 }}>←</span>
              {!isMobile && 'Volver al menú'}
            </button>
          )}

          {/* Botón "Salir del universo" — siempre visible */}
          <button
            onClick={onExit}
            style={{
              fontFamily: T.ff.mono,
              fontSize: isMobile ? 9 : 10,
              color: view === 'menu' ? '#ffffff' : meta.color,
              background: 'transparent',
              border: `1px solid ${view === 'menu' ? 'rgba(255,255,255,0.3)' : meta.color + '30'}`,
              borderRadius: 6,
              padding: isMobile ? '4px 12px' : '6px 16px',
              cursor: 'pointer',
              transition: 'all .25s ease',
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              if (view === 'menu') {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.borderColor = '#ffffff'
              } else {
                e.currentTarget.style.background = `${meta.color}15`
                e.currentTarget.style.borderColor = meta.color
                e.currentTarget.style.boxShadow = `0 0 20px ${meta.color}30`
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = view === 'menu' ? 'rgba(255,255,255,0.3)' : `${meta.color}30`
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <span style={{ fontSize: isMobile ? 12 : 14 }}>✕</span>
            {!isMobile && 'Salir'}
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          BOTONES LATERALES — Solo en la vista de cuadrante
      ══════════════════════════════════════════════════════════ */}
      {view === 'quadrant' && !isMobile && currentQ > 0 && (
        <ArrowBtn dir="left" color={meta.color} onClick={() => {
          const next = currentQ - 1
          captureEvent('quadrant_changed', {
            quadrant_id:    quadrants[next]?.id,
            quadrant_number: quadrants[next]?.number,
            from_quadrant:  quadrants[currentQ]?.id,
            method:         'arrow',
          })
          setCurrentQ(next)
        }} />
      )}
      {view === 'quadrant' && !isMobile && currentQ < quadrants.length - 1 && (
        <ArrowBtn dir="right" color={meta.color} onClick={() => {
          const next = currentQ + 1
          captureEvent('quadrant_changed', {
            quadrant_id:    quadrants[next]?.id,
            quadrant_number: quadrants[next]?.number,
            from_quadrant:  quadrants[currentQ]?.id,
            method:         'arrow',
          })
          setCurrentQ(next)
        }} />
      )}

      {/* Reader: se monta cuando hay una entrada seleccionada */}
      {selectedEntry && (
        <Reader
          entry={selectedEntry}
          color={meta.color}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  )
}