// ════════════════════════════════════════════════════════════════════
//  Landing.jsx — Pantalla de entrada al universo Humanidad 101
//
//  FUNCIONALIDAD:
//  - Fondo animado con Pixel Snow (nieve pixelada)
//  - Layout de dos columnas: contenido principal a la izquierda,
//    redes sociales a la derecha
//  - Totalmente responsive: se adapta a móvil, tablet y desktop
//  - Transición de salida con animación al entrar al Timeline
// ════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { captureEvent } from './analytics'

// ══════════════════════════════════════════════════════════════════
//  TOKENS DE DISEÑO 
// ══════════════════════════════════════════════════════════════════

const T = {
  bg:        '#050505',
  onSurface: '#e8e4e3',
  onVariant: '#7a8fa0',
  outline:   '#2a3540',
  cyan:      '#00C8F0',
  gold:      '#F5C518',
  violet:    '#A076F9',
  ff: {
    display: "'Sora', sans-serif",
    body:    "'Geist', sans-serif",
    mono:    "'JetBrains Mono', monospace",
  },
}

// ══════════════════════════════════════════════════════════════════
//  ESTILOS GLOBALES
//  Flag propio para no depender del Timeline ni duplicar en HMR.
// ══════════════════════════════════════════════════════════════════

if (!window.__h101_landing_styles) {
  window.__h101_landing_styles = true
  const s = document.createElement('style')
  s.id = 'h101-landing-styles'
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=Geist:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; }
    body { overflow: hidden; background: #050505; cursor: default; }
    @keyframes h-fadein    { from{opacity:0} to{opacity:1} }
    @keyframes h-slideup   { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
    @keyframes h-float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
    @keyframes h-ring      { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.8);opacity:0} }
    @keyframes h-exit      { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.06);filter:blur(8px)} }
    @keyframes h-glow-pulse{ 0%,100%{opacity:.5} 50%{opacity:1} }
    .h101-scroll::-webkit-scrollbar{display:none}
    .h101-scroll{-ms-overflow-style:none;scrollbar-width:none}
  `
  document.head.appendChild(s)
}

// ══════════════════════════════════════════════════════════════════
//  PIXEL SNOW — Fondo animado
// ══════════════════════════════════════════════════════════════════

function PixelSnow() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let width  = window.innerWidth
    let height = window.innerHeight
    let particles = []
    let rafId

    const isMobile      = width < 640
    const particleCount = isMobile ? 100 : 180

    class Particle {
      constructor() {
        this.x       = Math.random() * width
        this.y       = Math.random() * height - height
        this.size    = Math.floor(Math.random() * 4) + 2
        this.speed   = 0.3 + Math.random() * 0.8
        this.wind    = (Math.random() - 0.5) * 0.3
        this.opacity = 0.3 + Math.random() * 0.5
        this.phase   = Math.random() * Math.PI * 2
      }
      update() {
        this.y     += this.speed * 1.2
        this.x     += Math.sin(this.phase + this.y * 0.005) * 0.15 + this.wind * 0.2
        this.phase += 0.02
        if (this.y > height + 10) {
          this.y    = -10
          this.x    = Math.random() * width
          this.size  = Math.floor(Math.random() * 4) + 2
          this.speed = 0.3 + Math.random() * 0.8
        }
        if (this.x < -10)        this.x = width + 10
        if (this.x > width + 10) this.x = -10
      }
      draw() {
        ctx.fillStyle = `rgba(255,255,255,${this.opacity * 0.7})`
        ctx.fillRect(this.x, this.y, this.size, this.size)
      }
    }

    const init = () => {
      particles = []
      for (let i = 0; i < particleCount; i++) {
        const p = new Particle()
        p.y = Math.random() * height
        particles.push(p)
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height)
      particles.forEach(p => { p.update(); p.draw() })
      rafId = requestAnimationFrame(animate)
    }

    const resize = () => {
      width          = window.innerWidth
      height         = window.innerHeight
      canvas.width   = width
      canvas.height  = height
      init()
    }

    resize()
    animate()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      background: 'radial-gradient(ellipse at center,#0a0a12 0%,#050505 100%)',
    }} />
  )
}

// ══════════════════════════════════════════════════════════════════
//  SOCIAL LINK — Botón de red social
// ══════════════════════════════════════════════════════════════════

function SocialLink({ href, label, icon, accent, sublabel, platform }) {
  const [hov, setHov] = useState(false)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => captureEvent('social_link_clicked', { platform })}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 6, textDecoration: 'none',
        padding: '12px 18px', borderRadius: 10,
        border: `2px solid ${hov ? accent + '60' : T.outline}`,
        background: hov ? `${accent}0a` : 'rgba(8,8,14,0.5)',
        backdropFilter: 'blur(12px)',
        transition: 'all .25s ease', cursor: 'pointer',
        minWidth: 80, minHeight: 55,
        boxShadow: hov ? `0 0 24px ${accent}20` : 'none',
      }}
    >
      <div style={{
        color: hov ? accent : T.onVariant, transition: 'color .2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20,
      }}>
        {icon}
      </div>
      <span style={{
        fontFamily: T.ff.mono, fontSize: 8,
        color: hov ? accent : T.onVariant,
        letterSpacing: '.12em', textTransform: 'uppercase',
        transition: 'color .2s',
      }}>
        {label}
      </span>
      {sublabel && (
        <span style={{ fontFamily: T.ff.mono, fontSize: 7, color: `${accent}80`, letterSpacing: '.08em' }}>
          {sublabel}
        </span>
      )}
    </a>
  )
}

// ══════════════════════════════════════════════════════════════════
//  ENTER BUTTON — Botón principal de entrada
//  Solo maneja la animación visual. El evento se captura en
//  handleEnter del componente padre (Landing) para incluir
//  el contexto del dispositivo.
// ══════════════════════════════════════════════════════════════════

function EnterButton({ onEnter }) {
  const [hov, setHov]           = useState(false)
  const [pressing, setPressing] = useState(false)

  // onEnter aquí ya es handleEnter del Landing (que captura el evento)
  const handleClick = () => {
    setPressing(true)
    setTimeout(onEnter, 600)
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        fontFamily: T.ff.mono,
        fontSize: 'clamp(10px,1.2vw,11px)',
        letterSpacing: '.22em', textTransform: 'uppercase',
        color:      pressing ? T.bg   : hov ? T.bg   : T.cyan,
        background: pressing ? T.cyan : hov ? T.cyan : 'transparent',
        border: `1px solid ${hov || pressing ? T.cyan : T.cyan + '50'}`,
        borderRadius: 8,
        padding: 'clamp(12px,1.5vw,14px) clamp(24px,3vw,40px)',
        cursor: 'pointer', transition: 'all .3s ease',
        boxShadow: hov || pressing
          ? `0 0 40px ${T.cyan}50,0 0 80px ${T.cyan}20`
          : `0 0 20px ${T.cyan}15`,
        overflow: 'hidden', whiteSpace: 'nowrap',
      }}
    >
      {/* Anillo pulsante al hover */}
      {hov && !pressing && (
        <div style={{
          position: 'absolute', inset: -4, borderRadius: 10,
          border: `1px solid ${T.cyan}40`,
          animation: 'h-ring 1s ease-out infinite',
          pointerEvents: 'none',
        }} />
      )}
      {pressing ? 'Iniciando…' : 'Entrar al universo'}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════
//  ICONOS SVG de las redes sociales
//  Separados para no repetirlos en mobile y desktop
// ══════════════════════════════════════════════════════════════════

const Icons = {
  instagram: (size = 20) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  
  reddit: (size = 20) => (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
    </svg>
  ),

  kofi: (size = 20) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/>
  </svg>
  ),
}

// Datos de las redes para no repetir la definición en mobile/desktop
const SOCIAL_LINKS = [
  { href: 'https://www.instagram.com/humanidad101/', label: 'Instagram', accent: '#E1306C', platform: 'instagram', icon: Icons.instagram },
  { href: 'https://www.reddit.com/r/Humanidad101/', label: 'Reddit',    accent: '#FF4500', platform: 'reddit',    icon: Icons.reddit    },
  { href: 'https://ko-fi.com/humanidad101', label: 'Ko-fi', accent: '#72A5F2', platform: 'Ko-fi', icon: Icons.kofi },
]

// ══════════════════════════════════════════════════════════════════
//  LANDING PRINCIPAL
// ══════════════════════════════════════════════════════════════════

export default function Landing({ onEnter }) {
  const [exiting,  setExiting]  = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkSize = () => {
      const w = window.innerWidth
      setIsMobile(w < 640)
      setIsTablet(w >= 640 && w < 1024)
    }
    checkSize()
    window.addEventListener('resize', checkSize)
    return () => window.removeEventListener('resize', checkSize)
  }, [])

  // handleEnter: captura el evento y lanza la transición de salida.
  // Se pasa como onEnter al EnterButton para que el botón no necesite
  // importar captureEvent ni conocer el contexto del dispositivo.
  const handleEnter = () => {
    captureEvent('landing_enter_clicked', {
      device_type: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
    })
    setExiting(true)
    setTimeout(onEnter, 580)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, overflow: 'hidden',
      animation: exiting ? 'h-exit .6s ease forwards' : 'none',
    }}>

      {/* Capa 1: Pixel Snow */}
      <PixelSnow />

      {/* Capa 2: Scanlines CRT */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)',
      }} />

      {/* Capa 3: Viñeta */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        background: 'radial-gradient(ellipse 75% 65% at 50% 48%,transparent 35%,rgba(5,5,5,0.85) 100%)',
      }} />

      {/* Capa 4: Contenido */}
      <div style={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: isMobile ? 'center' : 'space-between',
        padding: isMobile ? '24px 20px' : isTablet ? '32px 36px' : '40px 48px',
        gap: isMobile ? 24 : 40,
      }}>

        {/* ── Columna izquierda: contenido principal ── */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: isMobile ? 'center' : 'flex-start',
          maxWidth: isMobile ? '100%' : '55%',
          width: isMobile ? '100%' : 'auto',
          textAlign: isMobile ? 'center' : 'left',
        }}>

          {/* Eyebrow: nombre del autor */}
          <div style={{
            fontFamily: T.ff.mono, fontSize: isMobile ? 8 : 10,
            color: T.onVariant,
            letterSpacing: isMobile ? '.2em' : '.28em', textTransform: 'uppercase',
            marginBottom: isMobile ? 20 : 28,
            animation: 'h-fadein 1s .1s ease both',
            display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12,
          }}>
            <div style={{ width: isMobile ? 16 : 24, height: 1, background: `linear-gradient(to right,transparent,${T.onVariant}60)` }} />
            Suler Álvarez Naranjo
            <div style={{ width: isMobile ? 16 : 24, height: 1, background: `linear-gradient(to left,transparent,${T.onVariant}60)` }} />
          </div>

          {/* Título principal con flotación */}
          <h1 style={{
            fontFamily: T.ff.display,
            fontSize: isMobile ? 'clamp(2rem,8vw,3rem)' : 'clamp(2.4rem,7vw,4.5rem)',
            fontWeight: 800, lineHeight: .92, letterSpacing: '-.02em',
            marginBottom: isMobile ? 24 : 32,
            animationName: 'h-slideup,h-float',
            animationDuration: '.8s,6s',
            animationDelay: '.2s,1s',
            animationFillMode: 'both,none',
            animationTimingFunction: 'ease,ease-in-out',
            animationIterationCount: '1,infinite',
          }}>
            <span style={{ color: T.cyan, textShadow: `0 0 60px ${T.cyan}50,0 0 120px ${T.cyan}20` }}>
              Humanidad
            </span>
            {' '}
            <span style={{ color: '#ffffff', textShadow: `0 0 80px ${T.gold}40,0 2px 60px rgba(0,0,0,.8)` }}>
              101
            </span>
          </h1>

          {/* Dots: uno por cuadrante */}
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: isMobile ? 8 : 12,
            marginBottom: isMobile ? 24 : 36,
            animation: 'h-fadein .8s .5s ease both',
          }}>
            <div style={{ width: isMobile ? 24 : 40, height: 1, background: `linear-gradient(to right,transparent,${T.cyan}50)` }} />
            <div style={{ width: isMobile ? 4 : 5, height: isMobile ? 4 : 5, borderRadius: '50%', background: T.gold,   boxShadow: `0 0 8px ${T.gold}`   }} />
            <div style={{ width: isMobile ? 4 : 5, height: isMobile ? 4 : 5, borderRadius: '50%', background: T.cyan,   boxShadow: `0 0 8px ${T.cyan}`   }} />
            <div style={{ width: isMobile ? 4 : 5, height: isMobile ? 4 : 5, borderRadius: '50%', background: T.violet, boxShadow: `0 0 8px ${T.violet}` }} />
            <div style={{ width: isMobile ? 24 : 40, height: 1, background: `linear-gradient(to left,transparent,${T.cyan}50)` }} />
          </div>

          {/* Frase del universo */}
          <p style={{
            fontFamily: T.ff.body,
            fontSize: isMobile ? 'clamp(12px,2.5vw,14px)' : 'clamp(13px,1.6vw,16px)',
            fontStyle: 'italic',
            color: 'rgba(232,228,227,0.55)',
            lineHeight: 1.85,
            maxWidth: isMobile ? '100%' : 580,
            textAlign: isMobile ? 'center' : 'left',
            marginBottom: isMobile ? 16 : 20,
            animation: 'h-slideup .8s .55s ease both',
          }}>
            "Con el homo-sapiens en el primer escalón de la cadena alimenticia,
            presa y depredador se hicieron uno, sobreviviendo en un sistema de
            ovación a los pecados de su Dios, la estabilidad era inalcanzable."
          </p>

          {/* Descripción breve */}
          <p style={{
            fontFamily: T.ff.body,
            fontSize: isMobile ? 'clamp(11px,2vw,13px)' : 'clamp(12px,1.3vw,14px)',
            color: T.onVariant, lineHeight: 1.7,
            maxWidth: isMobile ? '100%' : 440,
            textAlign: isMobile ? 'center' : 'left',
            marginBottom: isMobile ? 32 : 48,
            animation: 'h-slideup .8s .7s ease both',
          }}>
            Un universo de ciencia ficción que abarca desde el Big Bang
            hasta el presente cósmico.
          </p>

          {/* Botón de entrada */}
          <div style={{
            animation: 'h-slideup .8s .85s ease both',
            width: isMobile ? '100%' : 'auto',
            display: 'flex',
            justifyContent: isMobile ? 'center' : 'flex-start',
          }}>
            <EnterButton onEnter={handleEnter} />
          </div>

        </div>

        {/* ── Columna derecha / fila inferior: redes sociales ── */}
        {!isMobile ? (
          // Desktop y tablet: columna vertical
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: isTablet ? 10 : 12,
            animation: 'h-slideup .8s 1s ease both',
            paddingRight: isTablet ? 10 : 20,
          }}>
            {SOCIAL_LINKS.map(s => (
              <SocialLink key={s.platform} {...s} icon={s.icon(20)} />
            ))}
          </div>
        ) : (
          // Móvil: fila horizontal
          <div style={{
            display: 'flex', flexDirection: 'row', alignItems: 'center',
            justifyContent: 'center', gap: 10, flexWrap: 'wrap',
            animation: 'h-slideup .8s 1s ease both',
            width: '100%', marginBottom: 100,
          }}>
            {SOCIAL_LINKS.map(s => (
              <SocialLink key={s.platform} {...s} icon={s.icon(16)} />
            ))}
          </div>
        )}

      </div>

      {/* Capa 5: Copyright */}
      <div style={{
        position: 'absolute',
        bottom: isMobile ? 30 : 36,
        left: '50%', transform: 'translateX(-50%)',
        fontFamily: T.ff.body,
        fontSize: isMobile ? 'clamp(9px,2vw,11px)' : 'clamp(11px,0.8vw,13px)',
        color: T.onVariant,
        animation: 'h-fadein 1.2s 1.2s ease both',
        textAlign: 'center',
        maxWidth: isMobile ? '95%' : 500,
        lineHeight: 1.6, opacity: 0.9,
        zIndex: 20, pointerEvents: 'none',
      }}>
        <p style={{ marginBottom: isMobile ? 10 : 20 }}>
          © {new Date().getFullYear()} Suler Álvarez Naranjo. Todos los derechos reservados.
        </p>
        <p style={{
          fontSize: isMobile ? 'clamp(7px,1.6vw,9px)' : 'clamp(11px,0.8vw,15px)',
          opacity: 0.7, marginBottom: isMobile ? 10 : 15,
          display: isMobile ? 'none' : 'block',
        }}>
          Los textos, imágenes y demás contenidos de este sitio web son propiedad de su autor
          y están protegidos por las leyes de propiedad intelectual.
          <br />
          Queda prohibida su reproducción, distribución o modificación sin autorización expresa.
        </p>
        <a
          href="mailto:u.humanidad101@gmail.com"
          style={{
            color: T.cyan, textDecoration: 'none',
            fontSize: isMobile ? 'clamp(9px,1.6vw,11px)' : 'clamp(9px,0.7vw,12px)',
            opacity: 0.9, transition: 'opacity .25s ease',
            fontFamily: T.ff.mono, letterSpacing: '.08em',
            pointerEvents: 'auto',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
        >
          u.humanidad101@gmail.com
        </a>
      </div>

    </div>
  )
}