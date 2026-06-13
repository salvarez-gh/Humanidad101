// ════════════════════════════════════════════════════════════════════
//  Timeline.jsx — Pantalla principal del universo Humanidad 101
//  Muestra los 3 cuadrantes como pantallas completas navegables.
//  Cada cuadrante tiene un fondo generativo en canvas, un bloque de
//  identidad (título, era, descripción) y la línea de tiempo con nodos.
// ════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import { db } from './firebase'                              // Conexión a Firestore
import { collection, getDocs } from 'firebase/firestore'    // API de lectura de Firebase
import Reader from './Reader'                                // Lector que se abre al clicar un nodo


// ══════════════════════════════════════════════════════════════════
//  ESTILOS GLOBALES
//  Se inyectan en <head> como un <style> dinámico.
//  Esto evita depender de un archivo CSS externo.
//  Si prefieres moverlos a index.css, elimina estas líneas
//  y copia el contenido al CSS.
// ══════════════════════════════════════════════════════════════════

const _style = document.createElement('style')   // Crea el elemento <style>
_style.textContent = `
  /* Importa las 3 fuentes del sistema de diseño desde Google Fonts */
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=Geist:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');

  /* Reset universal: elimina márgenes, paddings y usa box-sizing correcto */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* La app ocupa exactamente la pantalla completa */
  html, body, #root { height: 100%; }

  /* overflow:hidden evita scrollbars; el fondo base es negro espacio */
  body { overflow: hidden; background: #050505; cursor: default; }

  /* Oculta el scrollbar del lector en WebKit (Chrome, Safari) */
  .h101-scroll::-webkit-scrollbar { display: none; }

  /* Oculta el scrollbar del lector en Firefox e IE */
  .h101-scroll { -ms-overflow-style: none; scrollbar-width: none; }

  /* Fade simple: de transparente a opaco */
  @keyframes h-fadein    { from{opacity:0} to{opacity:1} }

  /* Desliza hacia arriba + aparece: usado en cards y secciones del lector */
  @keyframes h-slideup   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

  /* Desliza hacia abajo + aparece: usado en la navegación inferior */
  @keyframes h-slidedown { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }

  /* Efecto shimmer (brillo que recorre): usado en la barra de carga */
  @keyframes h-shimmer   { 0%{background-position:200% center} 100%{background-position:-200% center} }

  /* Anillo que se expande y desvanece: pulso del nodo al hacer hover */
  @keyframes h-ring      { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(3);opacity:0} }

  /* Segundo anillo, más rápido: capa extra del pulso del nodo */
  @keyframes h-ring2     { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(2.2);opacity:0} }

  /* Flotación suave: sube y baja 6px en loop */
  @keyframes h-float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }

  /* Pulso de brillo: oscila la opacidad entre 60% y 100% */
  @keyframes h-glow-pulse{ 0%,100%{opacity:.6} 50%{opacity:1} }

  /* Línea de escaneo que recorre la pantalla de arriba a abajo */
  @keyframes h-scan      { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }

  /* Trazo punteado animado en SVG (no usado actualmente, disponible) */
  @keyframes h-dash      { to{stroke-dashoffset: -20} }

  /* Aparición con escala + blur: para el Reader al abrirse */
  @keyframes h-appear    {
    0%   { opacity:0; transform:scale(.92) translateY(12px); filter:blur(4px); }
    100% { opacity:1; transform:scale(1)   translateY(0);    filter:blur(0);   }
  }

  /* Entrada de la barra de navegación inferior (sube desde abajo) */
  @keyframes h-nav-in {
    from { opacity:0; transform:translateX(-50%) translateY(16px); }
    to   { opacity:1; transform:translateX(-50%) translateY(0); }
  }

  /* Aparición de tarjeta: sube ligeramente con desenfoque */
  @keyframes h-card-reveal {
    from { opacity:0; transform:translateY(8px) scale(0.97); filter:blur(2px); }
    to   { opacity:1; transform:translateY(0)   scale(1);    filter:blur(0);   }
  }

  /* Entrada del bloque de era (desliza desde la izquierda) */
  @keyframes h-era-in {
    from { opacity:0; transform:translateX(-24px); }
    to   { opacity:1; transform:translateX(0); }
  }

  /* Crecimiento de la línea horizontal (no usado actualmente, disponible) */
  @keyframes h-line-grow {
    from { scaleX: 0; }   /* NOTA: scaleX aquí no funciona; debería ser transform:scaleX(0) */
    to   { scaleX: 1; }
  }
`
document.head.appendChild(_style)   // Inserta el <style> en el <head> del documento


// ══════════════════════════════════════════════════════════════════
//  TOKENS DE DISEÑO
//  Colores base y fuentes compartidos por todos los componentes.
//  Para cambiar el aspecto global, edita aquí.
// ══════════════════════════════════════════════════════════════════

const T = {
  bg:        '#050505',   // Fondo principal — negro espacio profundo
  surface:   '#0d0d12',   // Fondo de superficies elevadas (cards, modales)
  outline:   '#2a3540',   // Bordes sutiles entre elementos
  onSurface: '#e8e4e3',   // Texto principal sobre fondos oscuros
  onVariant: '#7a8fa0',   // Texto secundario, etiquetas, metadatos
  dim:       '#1a2030',   // Superficie aún más apagada (no usada directamente)
  ff: {
    display: "'Sora', sans-serif",           // Fuente de títulos y encabezados
    body:    "'Geist', sans-serif",          // Fuente de texto de lectura
    mono:    "'JetBrains Mono', monospace",  // Fuente técnica: logs, datos, etiquetas
  },
}


// ══════════════════════════════════════════════════════════════════
//  IDENTIDADES DE CUADRANTE (QM = Quadrant Meta)
//  Define el color y el fondo animado de cada cuadrante.
//  Añadir un Q4 requiere agregar una entrada aquí con su clave 'q4'.
// ══════════════════════════════════════════════════════════════════

const QM = {

  // ── Q1: EL ORIGEN ─────────────────────────────────────────────
  q1: {
    color:     '#F5C518',    // Dorado — representa el nacimiento del universo
    colorSoft: '#7a6000',    // Versión oscura del color (para bordes, tints)
    name:      'El Origen',  // Nombre de respaldo si Firebase no tiene 'name'

    // paint: función que dibuja el fondo animado en canvas.
    // Recibe ctx (contexto 2D), w (ancho), h (alto), t (tiempo en frames).
    // Se llama en cada frame del requestAnimationFrame loop.
    paint: (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h)   // Limpia el frame anterior antes de dibujar

      // ── Fondo: vacío cálido con gradiente radial ───────────────
      // Gradiente desde el centro (marrón muy oscuro) hacia los bordes (negro)
      const bg = ctx.createRadialGradient(w * .5, h * .5, 0, w * .5, h * .5, w * .85)
      bg.addColorStop(0, 'rgba(28,14,0,1)')   // Centro: marrón oscuro cálido
      bg.addColorStop(1, 'rgba(4,2,0,1)')     // Bordes: negro casi puro
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)               // Rellena toda la pantalla con el gradiente

      // ── Anillos de onda expansiva desde el centro ─────────────
      // 4 anillos, cada uno desfasado 0.25 en fase → efecto de onda continua
      for (let r = 0; r < 4; r++) {
        const phase = (t * .0004 + r * .25) % 1    // Fase de 0 a 1, cicla en el tiempo
        const radius = phase * w * .45              // Radio crece desde 0 hasta 45% del ancho
        const alpha = (1 - phase) * .12             // Transparencia: comienza visible, desaparece al expandirse
        ctx.beginPath()
        ctx.arc(w * .5, h * .5, radius, 0, Math.PI * 2)   // Círculo centrado en pantalla
        ctx.strokeStyle = `rgba(255,180,0,${alpha})`        // Dorado anaranjado con alpha variable
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // ── Partículas en órbita alrededor del centro ─────────────
      // 220 partículas orbitando con radio y ángulo variable en el tiempo
      for (let i = 0; i < 220; i++) {
        const ang = (i / 220) * Math.PI * 2 + Math.sin(t * .00025 + i * .4) * .5  // Ángulo base + oscilación
        const orbitR = 30 + Math.pow(i % 11, 1.6) * 8 + Math.sin(t * .0004 + i) * .20  // Radio variable
        const x = w * .5 + Math.cos(ang) * orbitR           // Coordenada X en la órbita
        const y = h * .5 + Math.sin(ang) * orbitR * .5      // Coordenada Y aplanada (elipse, no círculo)
        const r = .4 + (i % 4) * .5                         // Radio de cada partícula (0.4–1.9px)
        const a = .08 + .5 * Math.abs(Math.sin(t * .0007 + i * .6))   // Alpha oscilante
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        const hue = 28 + (i % 40) - 20    // Tono dorado-naranja con variación por partícula
        ctx.fillStyle = `hsla(${hue},100%,${55 + i % 30}%,${a})`
        ctx.fill()
      }

      // ── Singularidad central: gradiente radial brillante ──────
      const core = ctx.createRadialGradient(
        w * .5, h * .5, 0,
        w * .5, h * .5, 80 + Math.sin(t * .0008) * 20   // Radio pulsa con el tiempo
      )
      core.addColorStop(0, `rgba(255,220,80,${.18 + .06 * Math.sin(t * .001)})`)  // Centro brillante con pulso
      core.addColorStop(.3, 'rgba(255,100,0,0.06)')                                 // Halo naranja tenue
      core.addColorStop(1, 'rgba(0,0,0,0)')                                         // Borde transparente
      ctx.fillStyle = core
      ctx.fillRect(0, 0, w, h)   // Se aplica sobre todo el canvas (gradiente radial centrado)

      // ── Polvo cósmico en deriva ────────────────────────────────
      // 250 puntos que se mueven diagonalmente a diferente velocidad
      for (let i = 0; i < 250; i++) {
        const px = ((i * 139.7 + t * .012) % w + w) % w   // X: deriva horizontal cíclica
        const py = ((i * 81.3 + t * .008) % h + h) % h    // Y: deriva vertical cíclica
        const a = .03 + .07 * Math.abs(Math.sin(i * .7 + t * .0004))   // Alpha muy bajo (polvo sutil)
        ctx.beginPath()
        ctx.arc(px, py, .5, 0, Math.PI * 2)               // Punto de 0.5px de radio
        ctx.fillStyle = `rgba(255,200,60,${a})`
        ctx.fill()
      }
    }
  },

  // ── Q13: LA ERA HUMANA ─────────────────────────────────────────
  q13: {
    color:     '#00C8F0',       // Cian eléctrico — representa la humanidad y el espacio conocido
    colorSoft: '#004060',       // Versión oscura del cian
    name:      'La Era Humana',

    paint: (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h)   // Limpia el frame anterior

      // ── Fondo: espacio frío con gradiente radial ───────────────
      const bg = ctx.createRadialGradient(w * .25, h * .35, 0, w * .5, h * .5, w * .9)
      bg.addColorStop(0, 'rgba(0,14,30,1)')    // Centro: azul marino muy oscuro
      bg.addColorStop(1, 'rgba(1,3,10,1)')     // Bordes: casi negro
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // ── Campo de estrellas denso ──────────────────────────────
      // 500 estrellas con posiciones pseudo-aleatorias (deterministas por 'i')
      for (let i = 0; i < 500; i++) {
        const px = i * 173.7 % w    // X determinista: siempre la misma posición para cada 'i'
        const py = i * 97.3 % h     // Y determinista
        const a = .06 + .45 * Math.abs(Math.sin(i * .6 + t * .0005))   // Parpadeo suave
        const r = .3 + (i % 5) * .28    // Radio varía entre 0.3 y 1.42px
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${160 + i % 60},${210 + i % 40},255,${a})`   // Azul-blanco con variación
        ctx.fill()
      }

      // ── Brazos de galaxia — 2 espirales ──────────────────────
      for (let arm = 0; arm < 2; arm++) {
        for (let j = 0; j < 150; j++) {
          const p = j / 150                                      // Progreso a lo largo del brazo (0 a 1)
          const ang = arm * Math.PI + p * Math.PI * 4 + t * .00008   // Ángulo espiral + rotación lenta
          const dist = 15 + p * (w * .32)                       // Distancia al centro crece con p
          const x = w * .65 + Math.cos(ang) * dist              // X: posición en la galaxia (derecha)
          const y = h * .35 + Math.sin(ang) * dist * .42        // Y: aplanada para efecto de perspectiva
          const a = (1 - p) * .22 * Math.abs(Math.sin(j * .15 + t * .0003))   // Más brillante al centro
          ctx.beginPath()
          ctx.arc(x, y, 1.4, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(80,200,255,${a})`
          ctx.fill()
        }
      }

      // ── Brillo del núcleo galáctico ───────────────────────────
      const gc = ctx.createRadialGradient(w * .65, h * .35, 0, w * .65, h * .35, 100)
      gc.addColorStop(0, 'rgba(60,180,255,0.08)')   // Halo cian suave
      gc.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gc
      ctx.fillRect(0, 0, w, h)

      // ── Nebulosas dispersas ───────────────────────────────────
      // 6 manchas de niebla distribuidas por la pantalla
      for (let i = 0; i < 6; i++) {
        const nx = w * (.08 + i * .16)       // X: distribuidas horizontalmente
        const ny = h * (.2 + (i % 3) * .25) // Y: alternando 3 posiciones verticales
        const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, 50 + i * 25)
        ng.addColorStop(0, `rgba(0,120,220,${.012 + i * .003})`)   // Centro con alpha muy bajo
        ng.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = ng
        ctx.fillRect(0, 0, w, h)
      }
    }
  },

  // ── Q26: EL PRESENTE CÓSMICO ──────────────────────────────────
  q26: {
    color:     '#A076F9',           // Violeta — representa la trascendencia y el futuro
    colorSoft: '#3a0080',           // Versión oscura del violeta
    name:      'El Presente Cósmico',

    paint: (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h)

      // ── Centro de la ITE: desplazado — composición asimétrica ─
      // No centrado: queda al 58% horizontal y 44% vertical
      const cx = w * .60
      const cy = h * .45

      // ── Fondo: vacío profundo, apenas un susurro de índigo ────
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * .85)
      bg.addColorStop(0,  'rgba(8,4,20,1)')
      bg.addColorStop(.4, 'rgba(5,2,14,1)')
      bg.addColorStop(1,  'rgba(2,1,8,1)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // ── Campo de estrellas: parpadeo muy lento, cielo real ────
      // Cada estrella en su propia fase — nunca se apagan del todo
      for (let i = 0; i < 680; i++) {
        const sx = (i * 173.13 + 7.3) % w
        const sy = (i * 97.71  + 11.9) % h

        // Parpadeo: ciclo muy lento, fase individual por estrella
        const blink = Math.sin(t * .018 * (0.6 + (i % 7) * .08) + i * .37)
        const a = .04 + .38 * (blink * .5 + .5)   // [0.04 .. 0.42]

        // Tamaño: 80% micro, 15% mediana, 5% grande
        const sizeRoll = i % 20
        const r = sizeRoll < 16 ? .28 + (i % 4) * .12
                : sizeRoll < 19 ? .7  + (i % 3) * .18
                :                 1.2 + (i % 2) * .3

        // Color: azul-blanco mayoritarias, algunas cálidas, pocas violetas
        const colorRoll = i % 10
        let sr, sg, sb
        if      (colorRoll < 6) { sr = 200 + i%40; sg = 210 + i%35; sb = 255 }
        else if (colorRoll < 8) { sr = 255;         sg = 230 + i%20; sb = 180 + i%40 }
        else                    { sr = 190 + i%40;  sg = 160 + i%30; sb = 255 }

        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${sr},${sg},${sb},${a})`
        ctx.fill()

        // Halo suave para las pocas estrellas grandes
        if (sizeRoll === 19 && a > .2) {
          ctx.beginPath()
          ctx.arc(sx, sy, r * 3.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${sr},${sg},${sb},${a * .06})`
          ctx.fill()
        }
      }

      // ── Cascada de estrellas cayendo hacia el centro de la ITE ─
      // Partículas en corrientes gravitacionales curvas hacia el núcleo.
      const STRANDS = 500        // hebras por polo (más = más denso)
      const poleOffset = h * 1  // distancia vertical de origen al centro
      

      for (let pole = 0; pole < 2; pole++) {
        // polo 0 = viene de arriba (cy - offset), polo 1 = de abajo (cy + offset)
        const sign = pole === 0 ? -1 : 1

        for (let s = 0; s < STRANDS; s++) {
          // Cada hebra tiene su propia velocidad y fase de inicio
          const speed  = .0003 + s 
          const phase  = ((t * speed + s * (1 / STRANDS) + pole * .5) % 1)

          // Progreso a lo largo de la hebra: 0 = polo, 1 = núcleo
          // easeInCubic: se acelera fuertemente al acercarse
          const p = phase * phase * phase
          const q = 1 - p

          // Origen: arriba o abajo, con pequeño radio horizontal por hebra
          // para que no sean todas la misma línea (distribuidas en abanico angosto)
          const spreadAngle = (s / STRANDS) * Math.PI * 1.2
          const spreadR     = 0    // radio de dispersión en el origen (pequeño = espiral cerrada)
          const ox = cx + Math.cos(spreadAngle) * spreadR
          const oy = cy + sign * poleOffset

          // El punto de control hace la curva espiral:
          // girar el ángulo de dispersión + enrollarlo hacia el centro
          // Cuanto más grande el giro (.8 * Math.PI), más cerrada la espiral
          const ctrlAngle = spreadAngle + sign * 8 * Math.PI
          const ctrlR     = spreadR * 2
          const bx = cx + Math.cos(ctrlAngle) * ctrlR
          const by = cy + sign * poleOffset * .3    // punto de control a 30% del camino vertical

          // Posición en la curva Bézier cuadrática
          const x = q*q*ox + 2*q*p*bx + p*p*cx
          const y = q*q*oy + 2*q*p*by + p*p*cy

          // Grosor: línea, no punto. Más gruesa cerca del polo, más fina al centro
          const lineWidth = (1.4 - p * 1.1) * (0.6 + (s % 4) * .2)

          // Opacidad: aparece al nacer, desaparece al ser absorbida
          const fadeIn  = Math.min(1, p * 4)
          const fadeOut = p > .8 ? 1 - (p - .8) / .2 : 1
          const a = .08 + .35 * fadeIn * fadeOut

          // Color: blanco-azulado cerca del polo, virando a violeta al centro
          const whiteness = Math.floor((1 - p) * 80)
          const r = 180 + whiteness, g = 160 + whiteness, b = 255

          ctx.beginPath()
          ctx.arc(x, y, lineWidth, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`
          ctx.fill()
        }
      }

      // ── Anillos toroidales de la ITE: minimalistas, etéreos ──
      // 5 anillos - Respiran lentamente.
      const rings = [
        { rx: 10,  opacity: 1,  width: 0.8 },
        { rx: 72,  opacity: .5,  width: 1.2 },
        { rx: 118, opacity: .7,  width: .8  },
        { rx: 168, opacity: .8,  width: .7  },
        { rx: 225, opacity: .9, width: .5  },
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

      // ── Núcleo: brillo y pulso ────────────────
      const coreAlpha = .6 + .02 * Math.sin(t * .028)
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 58 + Math.sin(t * .00035) * 8)
      core.addColorStop(0, `rgba(170,120,255,${coreAlpha})`)
      core.addColorStop(.5, `rgba(100,60,200,${coreAlpha * .4})`)
      core.addColorStop(1,  'rgba(0,0,0,0)')
      ctx.fillStyle = core
      ctx.fillRect(0, 0, w, h)

      // ── Halo ambiental: apenas insinuado ──────────────────────
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
//  Monta el <canvas> y ejecuta el loop de animación con RAF.
//  Se redimensiona automáticamente con la ventana.
//  Prop: quadrantId ('q1' | 'q13' | 'q26') → selecciona la función paint
// ══════════════════════════════════════════════════════════════════

function CosmicCanvas({ quadrantId }) {
  const ref = useRef(null)    // Referencia al elemento <canvas> del DOM
  const raf = useRef(null)    // ID del requestAnimationFrame activo (para cancelarlo en cleanup)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return                           // Guarda de seguridad

    const ctx = canvas.getContext('2d')           // Contexto 2D para dibujar
    const meta = QM[quadrantId]
    if (!meta) return                             // Cuadrante desconocido → no dibuja

    let t = 0   // Contador de frames: incrementa en cada llamada al loop

    // resize: ajusta el canvas al tamaño exacto de la ventana.
    // Importante: si el canvas tiene diferente resolución que su CSS,
    // el dibujo se ve borroso o estirado.
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()                                      // Aplica el tamaño inicial
    window.addEventListener('resize', resize)     // Re-aplica cuando cambia la ventana

    // loop: función de animación que se llama ~60 veces por segundo
    const loop = () => {
      t += 1                                      // Avanza el contador de tiempo
      meta.paint(ctx, canvas.width, canvas.height, t)   // Dibuja el frame actual
      raf.current = requestAnimationFrame(loop)  // Solicita el siguiente frame
    }
    raf.current = requestAnimationFrame(loop)    // Inicia el loop

    // Cleanup: se ejecuta cuando el componente se desmonta o cambia quadrantId.
    // Cancela el RAF para no seguir dibujando en un canvas desmontado (memory leak).
    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('resize', resize)
    }
  }, [quadrantId])   // Solo se re-ejecuta si cambia el cuadrante

  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute', inset: 0,   // Ocupa toda la pantalla
        width: '100%', height: '100%',    // CSS: el canvas llena su contenedor
      }}
    />
  )
}


// ══════════════════════════════════════════════════════════════════
//  OVERLAY DE SCANLINES
//  Capa decorativa que simula la trama de una pantalla CRT.
//  Líneas horizontales de 4px: 2px transparentes + 2px con 4% de opacidad.
//  pointerEvents:none → no bloquea el ratón.
// ══════════════════════════════════════════════════════════════════

function Scanlines() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none',   // No captura eventos del ratón
      zIndex: 1,               // Sobre el canvas pero bajo el contenido
      background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)',
      // repeating-linear-gradient vertical:
      // 0–2px: transparente | 2–4px: negro 4% | y repite
    }} />
  )
}


// ══════════════════════════════════════════════════════════════════
//  NODO DE ENTRADA
//  Representa un escrito en la línea de tiempo.
//  Estructura visual (de arriba a abajo):
//    1. Tarjeta (card) con título, resumen y tipo
//    2. Línea conectora vertical
//    3. Dot (círculo pulsante) sobre la línea central
//
//  POSICIONAMIENTO RESPONSIVE DE LA TARJETA:
//  - Por defecto la tarjeta aparece ARRIBA de la línea.
//  - Si el nodo está en la zona izquierda (xPct < 20%), puede chocar
//    con el bloque de identidad de era (título/subtítulo).
//  - En ese caso, la tarjeta se mueve ABAJO de la línea
//    invirtiendo la dirección (flexDirection:'column-reverse').
//  - El umbral (CARD_FLIP_THRESHOLD) se puede ajustar.
// ══════════════════════════════════════════════════════════════════

// Porcentaje X a partir del cual la tarjeta baja (para no colisionar con el título de era)
// El título de era está en top:80, right:100 → ocupa el lado derecho del header.
// El riesgo de colisión es cuando el nodo está muy a la izquierda y alto.
// Ajusta este valor si cambias la posición del bloque de identidad.
const CARD_FLIP_THRESHOLD = 22  // % del ancho de pantalla

function Node({ entry, color, index, onClick }) {
  const [hovered, setHovered] = useState(false)

  // xPct: posición horizontal del nodo como % del ancho del track.
  // timePosition es un valor entre 0 y 1 en Firebase.
  // El track va de 8% a 90% del ancho de pantalla (12% izq + 15% der de margen).
  // Fórmula: 8 + timePosition * 82 → mapea [0,1] a [8%,90%].
  const xPct = 8 + entry.timePosition * 82

  // ¿Debe la tarjeta aparecer debajo de la línea?
  // Se activa cuando el nodo está muy a la izquierda y podría taparse
  // con el bloque de identidad de era (título, subtítulo del cuadrante).
  const cardBelow = xPct > CARD_FLIP_THRESHOLD

  // Distancia vertical entre el dot y el centro de la línea.
  // El track tiene height:320 y el dot está sobre la línea central (top:50%).
  // yOffset controla cuánto sube o baja el conjunto card+línea+dot respecto al centro.
  // El valor negativo mueve hacia arriba.
  const yOffset = -206   // px hacia arriba desde el centro de la línea

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: `${xPct}%`,                        // Posición horizontal según timePosition
        top: `calc(50% + ${yOffset}px)`,         // Centrado verticalmente + desplazamiento
        transform: 'translateX(-50%)',            // Centra el nodo en su coordenada X
        display: 'flex',
        // Si cardBelow: column-reverse invierte el orden → dot arriba, línea, card abajo
        // Si no: column normal → card arriba, línea, dot abajo
        flexDirection: cardBelow ? 'column-reverse' : 'column',
        alignItems: 'center',
        cursor: 'pointer',
        zIndex: 10,
        animation: `h-slideup .5s ${index * .12}s ease both`,   // Aparece escalonado con delay por índice
      }}
    >

      {/* ── TARJETA ─────────────────────────────────────────── */}
      {/* Glassmorphism: fondo traslúcido con blur, borde que brilla al hover */}
      <div style={{
        width: 240,                                          // Ancho fijo de la tarjeta
        background: hovered
          ? 'rgba(12,12,20,0.95)'   // Hover: más opaco y contrastado
          : 'rgba(8,8,14,0.7)',     // Normal: semitransparente
        backdropFilter: 'blur(16px)',                        // Desenfoque del fondo (glassmorphism)
        border: `1px solid ${hovered ? color : color + '30'}`,  // Borde iluminado al hover
        borderRadius: 10,
        padding: '14px 18px',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',   // Escala ligeramente al hover
        boxShadow: hovered
          ? `0 12px 40px rgba(0,0,0,.5), 0 0 20px ${color}30`  // Sombra + brillo de color al hover
          : 'none',
        transition: 'all .25s ease',
        // marginBottom o marginTop según la dirección del flexbox
        ...(cardBelow
          ? { marginTop: 12 }      // Si la card está abajo: separación hacia abajo del dot
          : { marginBottom: 12 }), // Si la card está arriba: separación hacia arriba del dot
        textAlign: 'left',
      }}>

        {/* Era de la entrada: etiqueta monoespaciada pequeña */}
        <div style={{
          fontFamily: T.ff.mono, fontSize: 9,
          color,                               // Color del cuadrante
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}>
          {entry.era}
        </div>

        {/* Título del escrito */}
        <div style={{
          fontFamily: T.ff.display, fontSize: 13,
          fontWeight: 600,
          color: T.onSurface,
          lineHeight: 1.3,
          marginBottom: 8,
        }}>
          {entry.title}
        </div>

        {/* Resumen: máximo 3 líneas con ellipsis */}
        <div style={{
          fontFamily: T.ff.body, fontSize: 11,
          color: T.onVariant,
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 3,               // Limita a 3 líneas
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: 8,
        }}>
          {entry.summary}
        </div>

        {/* Footer de la card: tipo + indicador de acción */}
        <div style={{
          fontFamily: T.ff.mono, fontSize: 9,
          color: `${color}80`,             // Color del cuadrante al 50% de opacidad
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {/* Punto decorativo del color del cuadrante */}
          <span style={{
            width: 4, height: 4, borderRadius: '50%',
            background: color,
            display: 'inline-block',
          }} />
          {entry.type} · leer →
        </div>
      </div>

      {/* ── LÍNEA CONECTORA ─────────────────────────────────── */}
      {/* Línea vertical delgada que conecta la card con el dot */}
      <div style={{
        width: 1,                                   // 1px de ancho
        height: 16,                                 // 16px de alto
        background: color,                          // Color del cuadrante
        opacity: hovered ? 0.8 : 0.4,             // Más visible al hover
        transition: 'opacity .2s',
      }} />

      {/* ── DOT (CÍRCULO PULSANTE) ──────────────────────────── */}
      {/* Círculo que se posa sobre la línea de tiempo central */}
      <div style={{ position: 'relative', flexShrink: 0 }}>

        {/* Anillo de pulso: solo visible al hover */}
        {hovered && (
          <div style={{
            position: 'absolute',
            inset: -2,                             // 2px más grande que el dot
            borderRadius: '50%',
            border: `1px solid ${color}`,
            animation: 'h-ring 2s ease-out infinite',   // Anillo que se expande y desvanece
          }} />
        )}

        {/* Dot principal */}
        <div style={{
          width: hovered ? 14 : 10,              // Crece al hover
          height: hovered ? 14 : 10,
          borderRadius: '50%',
          background: hovered
            ? color                              // Hover: relleno con el color del cuadrante
            : 'rgba(20,20,30,0.9)',              // Normal: fondo oscuro casi transparente
          border: `2px solid ${color}`,          // Borde siempre del color del cuadrante
          boxShadow: hovered
            ? `0 0 16px ${color}`               // Brillo neón al hover
            : `0 0 6px ${color}60`,              // Brillo tenue en estado normal
          transition: 'all .2s cubic-bezier(.34,1.56,.64,1)',   // Rebote elástico en la transición
        }} />
      </div>

    </div>
  )
}


// ══════════════════════════════════════════════════════════════════
//  PANTALLA DE CARGA
//  Se muestra mientras Firebase devuelve los datos.
//  Tres anillos concéntricos animados + texto + barra shimmer.
// ══════════════════════════════════════════════════════════════════

function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: T.bg,                          // Fondo negro espacio
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24,                                   // Separación entre elementos
    }}>

      {/* Anillos concéntricos animados */}
      <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 8 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute',
            inset: i * 10,                       // Cada anillo es 10px más pequeño que el anterior
            borderRadius: '50%',
            border: `1px solid rgba(0,200,240,${.5 - i * .15})`,   // Más transparente hacia adentro
            animation: `h-ring ${1.5 + i * .5}s ${i * .2}s ease-out infinite`,  // Velocidad y delay escalonados
          }} />
        ))}
        {/* Punto central fijo: no anima, es el núcleo del loading */}
        <div style={{
          position: 'absolute', inset: 28,      // 28px de margen = 80-28-28=24px de diámetro
          borderRadius: '50%',
          background: '#00C8F0',
          boxShadow: '0 0 20px #00C8F0',        // Brillo neón cian
        }} />
      </div>

      {/* Título de la app */}
      <div style={{
        fontFamily: T.ff.display,
        fontSize: 'clamp(1.6rem,4vw,2.8rem)',   // Responsive: mínimo 1.6rem, máximo 2.8rem
        fontWeight: 800, color: '#fff',
        letterSpacing: '.03em',
        animation: 'h-fadein 1.2s ease',
      }}>
        Humanidad <span style={{ color: '#00C8F0', textShadow: '0 0 40px #00C8F080' }}>101</span>
      </div>

      {/* Subtexto de carga */}
      <div style={{
        fontFamily: T.ff.mono, fontSize: 11,
        color: T.onVariant,
        letterSpacing: '.22em', textTransform: 'uppercase',
        animation: 'h-fadein 1.5s .4s ease both',   // Aparece con delay de 0.4s
      }}>
        Accediendo al universo
      </div>

      {/* Barra de progreso shimmer */}
      <div style={{
        width: 180, height: 1,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.06)',   // Riel de fondo muy tenue
        borderRadius: 1,
        animation: 'h-fadein 1s .6s ease both',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg,transparent,#00C8F0,transparent)',
          backgroundSize: '200% 100%',          // El gradiente es el doble de ancho
          animation: 'h-shimmer 1.4s linear infinite',   // El brillo recorre de derecha a izquierda
        }} />
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════
//  NAVEGACIÓN INFERIOR DE CUADRANTES
//  Barra fija en la parte inferior con un botón por cuadrante.
//  El botón activo tiene el dot encendido y una línea inferior.
// ══════════════════════════════════════════════════════════════════

function QuadrantNav({ quadrants, current, onChange }) {
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%',
      transform: 'translateX(-50%)',            // Centra horizontalmente
      zIndex: 100,
      display: 'flex', gap: 0, alignItems: 'stretch',
      background: 'rgba(8,10,18,0.8)',          // Fondo oscuro semitransparente
      backdropFilter: 'blur(24px)',             // Glassmorphism
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
      overflow: 'hidden',                       // Los botones no desbordan el borde redondeado
      animation: 'h-nav-in .6s .3s ease both', // Aparece desde abajo con delay de 0.3s
    }}>
      {quadrants.map((q, i) => {
        const meta = QM[q.id] || QM.q1    // Metadatos del cuadrante (color, nombre)
        const active = i === current       // ¿Es el cuadrante actualmente visible?
        return (
          <button key={q.id} onClick={() => onChange(i)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 20px',
            background: active ? `${meta.color}12` : 'transparent',   // Fondo tintado si activo
            border: 'none',
            // Separador entre botones: solo en la derecha de cada uno excepto el último
            borderRight: i < quadrants.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            cursor: 'pointer',
            transition: 'all .2s ease',
            position: 'relative',            // Para posicionar el indicador activo (absolute)
          }}>

            {/* Indicador activo: línea en el borde inferior del botón */}
            {active && (
              <div style={{
                position: 'absolute', bottom: 0,
                left: '20%', right: '20%',   // No llega a los bordes del botón
                height: 2, borderRadius: 1,
                background: meta.color,
                boxShadow: `0 0 8px ${meta.color}`,   // Brillo neón
              }} />
            )}

            {/* Dot del cuadrante: encendido si activo */}
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: active ? meta.color : `${meta.color}40`,     // Opaco si activo, tenue si no
              boxShadow: active ? `0 0 8px ${meta.color}` : 'none',
              transition: 'all .2s',
            }} />

            {/* Nombre del cuadrante */}
            <span style={{
              fontFamily: T.ff.mono, fontSize: 10,
              color: active ? meta.color : T.onVariant,   // Color activo vs apagado
              letterSpacing: '.12em', textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              transition: 'color .2s',
            }}>
              {q.name || meta.name}   {/* Prefiere el nombre de Firebase; cae en el nombre local */}
            </span>
          </button>
        )
      })}
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════
//  BOTÓN DE FLECHA (NAVEGACIÓN LATERAL)
//  Aparece en los laterales para navegar entre cuadrantes.
//  Solo se muestra si hay un cuadrante en esa dirección.
//  Props: dir ('left'|'right'), color, onClick
// ══════════════════════════════════════════════════════════════════

function ArrowBtn({ dir, color, onClick }) {
  const [hov, setHov] = useState(false)
  const isLeft = dir === 'left'   // Determina si es el botón izquierdo o derecho

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'fixed', top: '50%',
        [isLeft ? 'left' : 'right']: 20,    // Posición lateral: 20px del borde
        transform: 'translateY(-50%)',        // Centra verticalmente
        zIndex: 50,
        width: 44, height: 44,
        borderRadius: '50%',                  // Botón circular
        background: hov
          ? `${color}18`                     // Hover: tinte del color del cuadrante
          : 'rgba(8,10,18,0.6)',             // Normal: oscuro semitransparente
        border: `1px solid ${hov ? color + '60' : 'rgba(255,255,255,0.08)'}`,
        backdropFilter: 'blur(12px)',         // Glassmorphism
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .25s ease',
        boxShadow: hov ? `0 0 20px ${color}30` : 'none',   // Brillo al hover
      }}
    >
      {/* SVG de la flecha */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d={isLeft ? 'M10 3L5 8L10 13' : 'M6 3L11 8L6 13'}   // Path distinto para cada dirección
          stroke={hov ? color : T.onVariant}                      // Color de la flecha
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: 'stroke .2s' }}
        />
      </svg>
    </button>
  )
}


// ══════════════════════════════════════════════════════════════════
//  PANTALLA DE CUADRANTE
//  Una pantalla completa por cuadrante.
//  Solo renderiza el cuadrante activo (isActive).
//  Capas (de fondo a frente):
//    1. Canvas generativo (fondo animado)
//    2. Scanlines (overlay CRT)
//    3. Viñeta (oscurecimiento de bordes)
//    4. Identidad de era (top-right): número, era, nombre, línea
//    5. Descripción (bottom-left)
//    6. Marca de agua del número de cuadrante (muy transparente)
//    7. Track de la línea de tiempo con nodos
// ══════════════════════════════════════════════════════════════════

function QuadrantScreen({ quadrant, entries, isActive, onSelectEntry }) {
  const meta     = QM[quadrant.id] || QM.q1                        // Metadatos del cuadrante
  const color    = meta.color                                        // Color principal del cuadrante
  const qEntries = entries.filter(e => e.quadrantId === quadrant.id) // Solo las entradas de este cuadrante

  // Optimización: si este cuadrante no está activo, no renderiza nada.
  // Esto evita que haya 3 canvas animando simultáneamente.
  if (!isActive) return null

  return (
    <div style={{ position: 'absolute', inset: 0 }}>   {/* Ocupa toda la pantalla */}

      {/* Capa 1: fondo generativo animado */}
      <CosmicCanvas quadrantId={quadrant.id} />

      {/* Capa 2: overlay de scanlines (CRT) */}
      <Scanlines />

      {/* Capa 3: viñeta — oscurece los bordes para dar profundidad */}
      <div style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
        background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(5,5,5,0.75) 100%)',
        // Gradiente radial: transparente en el centro, oscuro en los bordes
      }} />

      {/* Capa 4: identidad de era — top right ───────────────────
          NOTA: este bloque está en top:80 right:100.
          Los nodos con timePosition bajo (muy a la izquierda) pueden aparecer
          cerca de este bloque. El sistema cardBelow en <Node> lo evita
          moviendo la tarjeta debajo de la línea cuando xPct < CARD_FLIP_THRESHOLD.
          Si cambias top/right aquí, ajusta también CARD_FLIP_THRESHOLD en <Node>. */}
      <div style={{
        position: 'absolute', top: 80, right: 100,   // Posición fija: 80px del top, 100px del right
        zIndex: 20,                                    // Sobre el canvas y la viñeta
        animation: 'h-era-in .6s ease both',          // Entrada deslizando desde la izquierda
      }}>

        {/* Eyebrow: "Era 2 · Nombre de la era" */}
        <div style={{
          fontFamily: T.ff.mono, fontSize: 10,
          color: `${color}60`,                        // Color del cuadrante al 60% de opacidad
          letterSpacing: '.28em',
          textTransform: 'uppercase', marginBottom: 10,
        }}>
          Era {quadrant.number} · {quadrant.era || meta.name}
          {/* quadrant.era viene de Firebase; meta.name es el fallback local */}
        </div>

        {/* Nombre del cuadrante: grande y prominente */}
        <h2 style={{
          fontFamily: T.ff.display,
          fontSize: 'clamp(2rem,4.5vw,3.5rem)',   // Responsive: entre 2rem y 3.5rem
          fontWeight: 800, color: '#fff',
          lineHeight: 1,
          textShadow: `0 0 60px ${color}40, 0 2px 40px rgba(0,0,0,.8)`,
          letterSpacing: '-.001em',
          marginBottom: 12,
        }}>
          {quadrant.name}
          {/* quadrant.name viene de Firebase (el nombre completo del cuadrante) */}
        </h2>

        {/* Línea de acento bajo el título */}
        <div style={{
          width: 60, height: 1, borderRadius: 1,
          background: `linear-gradient(to right,${color},transparent)`,
          boxShadow: `0 0 8px ${color}`,   // Brillo neón
        }} />
      </div>

      {/* Capa 4b: descripción — bottom left */}
      <div style={{
        position: 'absolute', bottom: 150, left: 60,   // 150px del fondo, 60px de la izquierda
        maxWidth: 340,                                   // Ancho máximo del texto descriptivo
        zIndex: 20,
        animation: 'h-slideup .7s .15s ease both',      // Aparece 0.15s después que el título
      }}>
        <p style={{
          fontFamily: T.ff.body, fontSize: 13,
          color: T.onVariant,
          lineHeight: 1.75,
        }}>
          {quadrant.description}   {/* Texto descriptivo de Firebase */}
        </p>
      </div>

      {/* Capa 5: marca de agua — número gigante semi-invisible */}
      <div style={{
        position: 'absolute', right: 48, top: '50%',
        transform: 'translateY(-60%)',                  // -60% lo sube un poco respecto al centro
        fontFamily: T.ff.display,
        fontSize: 'clamp(8rem,18vw,16rem)',             // Muy grande, responsive
        fontWeight: 800, lineHeight: 1,
        color: `${color}03`,                            // Casi invisible: 4% de opacidad
        userSelect: 'none', pointerEvents: 'none',      // No interactivo
        zIndex: 1,
        letterSpacing: '-.04em',
      }}>
        0{quadrant.number}   {/* "01", "02", "03" */}
      </div>

      {/* Capa 6: track de la línea de tiempo ────────────────────
          height:320 es el contenedor del track completo.
          La línea central está en top:50% de este contenedor.
          Los nodos se posicionan relativos a este div. */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: '50%',
        height: 320,                    // Alto del área de la línea de tiempo
        transform: 'translateY(-50%)', // Centra verticalmente en la pantalla
        zIndex: 8,
      }}>

        {/* Línea central horizontal */}
        <div style={{
          position: 'absolute',
          left: '12%', right: '15%',  // No llega a los bordes: 12% izq, 15% der
          top: '50%',                  // Centrada verticalmente en el track
          height: 10,                  // Altura visual de la línea (gruesa, degradada)
          transform: 'translateY(-50%)',
          background: `linear-gradient(to right,transparent,${color}30 12%,${color}50 50%,${color}30 88%,transparent)`,
          // Degradado: aparece y desaparece en los bordes (efecto de profundidad)
        }} />

        {/* Etiqueta izquierda: inicio del cuadrante */}
        <div style={{
          position: 'absolute', left: '6%', top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: T.ff.mono, fontSize: 11,
          color: `${color}80`,           // Color del cuadrante al 50%
          letterSpacing: '.14em', fontWeight: 500,
          paddingRight: 12,              // Separación de la línea
          pointerEvents: 'none',         // No interactivo
          zIndex: 5,
          whiteSpace: 'nowrap',          // No permite salto de línea
        }}>
          {quadrant.startBillion === 0 ? 'BIG BANG' : `${quadrant.startBillion}B AÑOS`}
          {/* Si empieza en 0, muestra "BIG BANG"; si no, muestra "Xb AÑOS" */}
        </div>

        {/* Etiqueta derecha: fin del cuadrante */}
        <div style={{
          position: 'absolute', right: '8%', top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: T.ff.mono, fontSize: 11,
          color: `${color}80`,
          letterSpacing: '.14em', fontWeight: 500,
          paddingLeft: 12,
          pointerEvents: 'none',
          zIndex: 5,
          whiteSpace: 'nowrap',
        }}>
          {quadrant.endBillion}B AÑOS
        </div>

        {/* Marcas de tick a lo largo de la línea (20%, 40%, 60%, 80%) */}
        {[.2, .4, .6, .8].map(pos => (
          <div key={pos} style={{
            position: 'absolute',
            left: `${6 + pos * 88}%`,   // Mapeadas al mismo rango que la línea (6% a 94%)
            top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 0.25, height: 8,      // Línea muy delgada y corta
            background: `${color}25`,    // Muy tenue: solo como referencia visual
            pointerEvents: 'none',
          }} />
        ))}

        {/* Nodos: uno por cada entrada del cuadrante */}
        {qEntries.map((entry, i) => (
          <Node
            key={entry.id}
            entry={entry}
            color={color}
            index={i}                    // Para el delay escalonado de la animación
            onClick={() => onSelectEntry(entry)}
          />
        ))}

        {/* Estado vacío: si no hay entradas en este cuadrante */}
        {qEntries.length === 0 && (
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%,-50%)',
            fontFamily: T.ff.mono, fontSize: 11,
            color: `${color}30`,         // Muy tenue
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
//  Carga los datos de Firebase, maneja la navegación entre cuadrantes
//  y monta el Reader cuando se selecciona una entrada.
// ══════════════════════════════════════════════════════════════════

export default function Timeline() {
  const [quadrants,     setQuadrants]     = useState([])    // Lista de cuadrantes de Firebase
  const [entries,       setEntries]       = useState([])    // Lista de entradas de Firebase
  const [loaded,        setLoaded]        = useState(false) // ¿Terminó la carga?
  const [currentQ,      setCurrentQ]      = useState(0)     // Índice del cuadrante visible
  const [selectedEntry, setSelectedEntry] = useState(null)  // Entrada abierta en el Reader (null = cerrado)

  // ── Carga inicial de Firebase ──────────────────────────────────
  // Se ejecuta una sola vez al montar el componente (array vacío []).
  // Carga cuadrantes y entradas en paralelo con Promise.all.
  useEffect(() => {
  async function load() {
    const [qSnap, eSnap] = await Promise.all([
      getDocs(collection(db, 'quadrants')),
      getDocs(collection(db, 'entries')),
    ])
    
    // 1. Guardar todas las entradas primero
    const allEntries = eSnap.docs.map(d => d.data())
    setEntries(allEntries)
    
    // 2. Obtener todos los cuadrantes ordenados
    const allQuadrants = qSnap.docs.map(d => d.data()).sort((a, b) => a.number - b.number)
    
    // 3. FILTRAR: solo cuadrantes que tienen al menos una entrada
    const filteredQuadrants = allQuadrants.filter(q => 
      allEntries.some(e => e.quadrantId === q.id)
    )
    
    setQuadrants(filteredQuadrants)
    setLoaded(true)
  }
  load()
  }, [])   // [] = solo al montar, no se repite

  // ── Navegación por teclado (← →) ──────────────────────────────
  // Solo activa cuando los datos están cargados Y no hay Reader abierto.
  useEffect(() => {
    if (!loaded) return
    const onKey = e => {
      if (selectedEntry) return   // El Reader maneja sus propias teclas
      if (e.key === 'ArrowRight') setCurrentQ(q => Math.min(q + 1, quadrants.length - 1))
      if (e.key === 'ArrowLeft')  setCurrentQ(q => Math.max(q - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)   // Cleanup al desmontar
  }, [loaded, quadrants.length, selectedEntry])

  // ── Navegación por scroll de rueda ────────────────────────────
  // deltaY > 50 = scroll hacia abajo → siguiente cuadrante
  // deltaY < -50 = scroll hacia arriba → cuadrante anterior
  // El umbral de 50 evita disparos accidentales con trackpads sensibles.
  useEffect(() => {
    if (!loaded || selectedEntry) return   // No activo si hay Reader abierto
    const onWheel = e => {
      if (e.deltaY > 50)       setCurrentQ(q => Math.min(q + 1, quadrants.length - 1))
      else if (e.deltaY < -50) setCurrentQ(q => Math.max(q - 1, 0))
    }
    window.addEventListener('wheel', onWheel, { passive: true })   // passive:true mejora el rendimiento del scroll
    return () => window.removeEventListener('wheel', onWheel)
  }, [loaded, selectedEntry, quadrants.length])

  // ── Estado de carga ────────────────────────────────────────────
  if (!loaded) return <LoadingScreen />

  // meta: metadatos del cuadrante activo (para el color del header y los botones)
  const meta = QM[quadrants[currentQ]?.id] || QM.q1

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: T.bg,
      overflow: 'hidden',
      fontFamily: T.ff.body,
    }}>

      {/* Renderiza todas las pantallas; solo la activa se muestra (isActive) */}
      {quadrants.map((q, i) => (
        <QuadrantScreen
          key={q.id}
          quadrant={q}
          entries={entries}
          isActive={i === currentQ}      // Solo el cuadrante activo renderiza
          onSelectEntry={setSelectedEntry}
        />
      ))}

      {/* Header fijo con logo y estadísticas */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 52px',
        background: 'linear-gradient(to bottom,rgba(5,5,5,0.85) 0%,transparent 100%)',
        // Degradado: opaco arriba, transparente abajo (no tapa el contenido)
        pointerEvents: 'none',   // El header no captura clics (el logo sí, con pointerEvents:auto)
      }}>

        {/* Logo / nombre de la app */}
        <div style={{
          fontFamily: T.ff.display, fontSize: 17, fontWeight: 800,
          color: meta.color,                              // Cambia de color según el cuadrante
          textShadow: `0 0 30px ${meta.color}50`,        // Halo del color del cuadrante
          letterSpacing: '.04em',
          pointerEvents: 'auto',                          // Este elemento sí captura clics
        }}>
          Humanidad <span style={{ color: '#fff' }}>101</span>
          {/* "Humanidad" en el color del cuadrante, "101" siempre blanco */}
        </div>

{/* Comentado porque no se ven más que solo 1 escrito de momento */}
{/* Info secundaria: cantidad de escritos + instrucción de navegación 
<div style={{
  fontFamily: T.ff.mono, fontSize: 9.5,
  color: T.onVariant,
  letterSpacing: '.2em', textTransform: 'uppercase',
  display: 'flex', gap: 20,
}}>
  <span>{entries.length} ESCRITOS</span>
  <span style={{ color: T.outline }}>·</span>
  <span>← → NAVEGAR</span>
</div> */} 
       
      </header>

      {/* Botón flecha izquierda: solo si hay cuadrante anterior */}
      {currentQ > 0 && (
        <ArrowBtn dir="left" color={meta.color} onClick={() => setCurrentQ(q => q - 1)} />
      )}

      {/* Botón flecha derecha: solo si hay cuadrante siguiente */}
      {currentQ < quadrants.length - 1 && (
        <ArrowBtn dir="right" color={meta.color} onClick={() => setCurrentQ(q => q + 1)} />
      )}

      {/* Barra de navegación inferior */}
      <QuadrantNav
        quadrants={quadrants}
        current={currentQ}
        onChange={setCurrentQ}
      />

      {/* Reader: se monta cuando hay una entrada seleccionada */}
      {selectedEntry && (
        <Reader
          entry={selectedEntry}
          color={meta.color}
          onClose={() => setSelectedEntry(null)}   // Cierra el Reader y vuelve a la Timeline
        />
      )}
    </div>
  )
}