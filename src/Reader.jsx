// ════════════════════════════════════════════════════════════════════
//  Reader.jsx — Lector de entradas del universo Humanidad 101
//  Recibe: entry (objeto Firebase), color (hex del cuadrante), onClose (fn)
//
//  MARCADORES DE BLOQUE (guía completa al final del archivo):
//
//  MARCADOR         TIPO               EJEMPLO
//  ---              separator          ---
//  ## Texto         section-title      ## El primer día
//  ### Texto        subheading         ### Nota del archivo
//  Alus Anahori     signature          Alus Anahori
//  >PIA Título      pia-start          >PIA Necromancia noble
//  <PIA             pia-end            <PIA
//  *texto*          thought            *Cincuenta veces sin propósito.*
//  :D texto         dialogue           :D Lo que dice en voz alta
//  :P texto         dialogue-pia       :P Lo que dice en el recuerdo
//  @img descripción media-img          @img Fotografía del exilio
//  @gif descripción media-gif          @gif Mandala de cambio de cuerpo
//  @audio desc      media-audio        @audio Voz natural de Zuri
//  ● texto          log                ● Años de exilio: 808 D.E.
//  Clave: valor     data               Coordenadas: X-445
//  "texto           quote              "El tiempo es una deuda
//  texto normal     paragraph          Narrador, descripciones, prosa
// ════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback } from 'react'

// ── TOKENS DE DISEÑO ─────────────────────────────────────────────
const T = {
  bg:        '#050505',   // Fondo principal (negro espacio)
  surface:   '#0d0d12',   // Fondo de superficies elevadas
  onSurface: '#e8e4e3',   // Texto principal sobre fondo oscuro
  onVariant: '#7a8fa0',   // Texto secundario / etiquetas apagadas
  outline:   '#2a3540',   // Bordes sutiles

  thought:   '#c8b8ff',   // Violeta claro — pensamientos de Zuri
  pia:       '#00e5b4',   // Verde-cian — identidad del PIA
  media:     '#ffb86c',   // Naranja — multimedia

  ff: {
    display: "'Sora', sans-serif",
    body:    "'Geist', sans-serif",
    mono:    "'JetBrains Mono', monospace",
  },
}

// ══════════════════════════════════════════════════════════════════
//  PREPROCESADOR DE LÍNEAS
//  Antes de dividir en bloques, recorre el texto línea por línea
//  y asegura que cada marcador especial quede rodeado de líneas
//  vacías (\n\n), para que el splitter por \n\n lo detecte como
//  bloque independiente aunque el autor no lo haya separado.
//  Esto es la raíz del problema de detección: solucionado aquí.
// ══════════════════════════════════════════════════════════════════

// Lista de prefijos que siempre deben ser su propio bloque
const BLOCK_PREFIXES = [
  '---',    // separator
  '## ',    // section-title
  '### ',   // subheading
  '>PIA',   // pia-start
  '<PIA',   // pia-end
  '*',      // thought
  ':D ',    // dialogue
  ':P ',    // dialogue-pia
  '@img ',  // media imagen
  '@gif ',  // media gif
  '@audio ',// media audio
  '●', '•', '►',  // log bullets
]

function preprocessContent(content) {
  const lines = content.split('\n')
  const out   = []

  for (let i = 0; i < lines.length; i++) {
    const line    = lines[i]
    const trimmed = line.trim()
    const prev    = out[out.length - 1]

    // ¿Esta línea empieza con un marcador de bloque especial?
    const isSpecial = BLOCK_PREFIXES.some(p => trimmed.startsWith(p))
      || trimmed === '---'
      || trimmed === '<PIA'
      || trimmed === 'Alus Anahori'

    // ¿La línea anterior era vacía?
    const prevEmpty = !prev || prev.trim() === ''

    // Si es especial y la línea anterior NO era vacía, inserta línea vacía antes
    if (isSpecial && !prevEmpty) {
      out.push('')
    }

    out.push(line)

    // Si es especial y la línea siguiente NO es vacía, inserta línea vacía después
    const next = lines[i + 1]
    if (isSpecial && next !== undefined && next.trim() !== '') {
      out.push('')
    }
  }

  // Colapsa más de 2 saltos de línea seguidos
  return out.join('\n').replace(/\n{3,}/g, '\n\n')
}

// ══════════════════════════════════════════════════════════════════
//  DETECCIÓN DE TIPO DE BLOQUE
//  Lee el texto del bloque y devuelve su tipo.
//  El orden es crítico: más específico primero.
// ══════════════════════════════════════════════════════════════════

function detectBlockType(text) {
  const t = text.trim()

  // Separador decorativo: exactamente "---"
  if (t === '---')                                          return 'separator'

  // Nueva página: "## Título" (no "### ")
  if (t.startsWith('## ') && !t.startsWith('### '))        return 'section-title'

  // Subtítulo dentro de sección: "### Texto"
  if (t.startsWith('### '))                                 return 'subheading'

  // Firma del escritor: línea exacta
  if (t === 'Alus Anahori')                                 return 'signature'

  // Inicio de archivo PIA: ">PIA Título"
  // Un solo > para no chocar con caracteres de bloque de texto
  if (t.startsWith('>PIA'))                                 return 'pia-start'

  // Fin de archivo PIA: "<PIA"
  if (t.startsWith('<PIA'))                                 return 'pia-end'

  // Multimedia: "@img", "@gif", "@audio"
  if (t.startsWith('@img '))                                return 'media-img'
  if (t.startsWith('@gif '))                                return 'media-gif'
  if (t.startsWith('@audio '))                              return 'media-audio'

  // Pensamiento de Zuri: *texto* (asteriscos como en markdown de cursiva)
  // Debe empezar Y terminar con * para no confundirse con texto normal
  if (t.startsWith('*') && t.endsWith('*') && t.length > 2) return 'thought'

  // Diálogo en archivo PIA: ":P texto"
  // Va antes que :D para que :P no caiga en dialogue
  if (t.startsWith(':P '))                                  return 'dialogue-pia'

  // Diálogo hablado presente: ":D texto"
  if (t.startsWith(':D '))                                  return 'dialogue'

  // Log / bitácora: bullet, fecha o palabra clave
  if (/^\d{2}\/\d{2}\/\d{4}/.test(t))                      return 'log'
  if (/^[●•►]/.test(t))                                     return 'log'
  if (/^(ARCHIVO|LUNCI|FECHA|NOMBRE|ZONA|SEMANA|Registro|TEXTO DEL ARCHIVO|INICIO DEL VIAJE|DESTINO|TIEMPO DE VIAJE)/.test(t))
                                                            return 'log'

  // Cita: empieza con " o guión largo —
  if (t.startsWith('"') || t.startsWith('—'))               return 'quote'

  // Dato clave:valor: texto corto sin especiales + ": valor"
  if (/^[A-ZÁÉÍÓÚa-záéíóú][^:●•—"*@><%]{2,30}:\s/.test(t)) return 'data'

  // Párrafo por defecto
  return 'paragraph'
}

// ══════════════════════════════════════════════════════════════════
// ── PROCESADOR DE SALTOS DE LÍNEA INTERNOS ───────────────────────
// Convierte el marcador "|" dentro de un bloque en saltos de línea reales.
// Permite añadir líneas dentro de una cita o log sin romper el bloque.
// Uso en el .txt:   "Primera línea | Segunda línea | Tercera línea"
// ══════════════════════════════════════════════════════════════════

function splitLines(text) {
  return text.split('|').map(s => s.trim())
}

// Renderiza texto con saltos de línea internos (retorna array de elementos JSX)
function renderLines(text) {
  const parts = splitLines(text)
  return parts.map((line, i) => (
    // Cada segmento separado por "|" se muestra en su propia línea
    <span key={i}>
      {line}
      {i < parts.length - 1 && <br />}  {/* <br> entre segmentos, no al final */}
    </span>
  ))
}




// ══════════════════════════════════════════════════════════════════
//  DIVISIÓN EN PÁGINAS
//  "## Título" parte el contenido en páginas navegables con ← →
// ══════════════════════════════════════════════════════════════════

function splitIntoSections(content) {
  // Primero preprocesa para garantizar que los bloques estén bien separados
  const processed = preprocessContent(content)
  const lines      = processed.split('\n')
  const sections   = []
  let currentTitle = null
  let currentLines = []

  for (const line of lines) {
    if (line.trimStart().startsWith('## ') && !line.trimStart().startsWith('### ')) {
      if (currentLines.join('').trim())
        sections.push({ title: currentTitle, content: currentLines.join('\n').trim() })
      currentTitle = line.replace(/^##\s*/, '').trim()
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }

  if (currentLines.join('').trim())
    sections.push({ title: currentTitle, content: currentLines.join('\n').trim() })

  return sections.length > 0 ? sections : [{ title: null, content: processed.trim() }]
}


// ══════════════════════════════════════════════════════════════════
//  BLOQUES VISUALES
// ══════════════════════════════════════════════════════════════════

// ── SEPARADOR (---) ───────────────────────────────────────────────
function BlockSeparator({ color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '36px 0' }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right,${color}40,transparent)` }} />
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: `${color}60` }} />
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to left,${color}40,transparent)` }} />
    </div>
  )
}

// ── LOG / BITÁCORA (● texto) ──────────────────────────────────────
function BlockLog({ text, color }) {
  const clean = text.replace(/^[●•►]\s*/, '')
  return (
    <div style={{
      fontFamily: T.ff.mono, fontSize: 12,
      color: '#b2b1f0',
      background: `linear-gradient(to right,${color}08,transparent)`,
      border: `1px solid ${color}18`,
      borderLeft: `2px solid ${color}70`,
      borderRadius: '0 8px 8px 0',
      padding: '12px 18px', marginBottom: 16,
      lineHeight: 1.8, letterSpacing: '.02em', textAlign: 'left',
    }}>
      {renderLines(clean)}
    </div>
  )
}

// ── CITA ("texto  o  —texto) ──────────────────────────────────────
function BlockQuote({ text, color }) {
  let d = text
  if (d.startsWith('—')) d = d.slice(1).trimStart()
  if (d.startsWith('"')) d = d.slice(1).trimStart()
  if (d.endsWith('"'))   d = d.slice(0, -1)
  return (
    <div style={{
      position: 'relative',
      fontFamily: T.ff.body, fontSize: 15, fontStyle: 'italic',
      color: 'rgba(251, 251, 251, 0.6)',
      padding: '20px 24px 20px 28px', margin: '28px 0', lineHeight: 1.9,
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: `linear-gradient(to bottom,transparent,${color}50,transparent)` }} />
      <div style={{ position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', border: `1px solid ${color}60`, background: T.bg }} />
      {renderLines(d)}
    </div>
  )
}

// ── DATO TÉCNICO (Clave: valor) ───────────────────────────────────
function BlockData({ text }) {
  const ci  = text.indexOf(':')
  const key = text.slice(0, ci).trim()
  const val = text.slice(ci + 1).trim()
  return (
    // Valor del texto
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', fontFamily: T.ff.mono, fontSize: 12.5, borderBottom: '2px solid rgba(255,255,255,0.04)', padding: '8px 0', }}>
    
    {/* Clave del texto - Fija */}
      <span style={{ color: T.onVariant, minWidth: 190, flexShrink: 0, fontSize: 13.5 }}>{key}</span>
    
    {/* VALOR - derecha con renderLines y justificado */}
      <div style={{ color: T.onSurface, flex: 1, textAlign: 'justify', lineHeight: 1.7, }}>
        {renderLines(val)}
      </div>
    </div>
  )
}

// ── PÁRRAFO NARRATIVO (texto sin marcador) ────────────────────────
// Narrador omnisciente, descripciones de escena, contexto del mundo.
// Soporta saltos de línea con | y ||
function BlockParagraph({ text, isFirst }) {
  return (
    <p style={{
      fontFamily: T.ff.body,
      fontSize: 16.5,
      lineHeight: 2.05,
      color: T.onSurface,
      fontWeight: 300, marginBottom: '1.7rem',
      textAlign: 'justify',
    }}>
      {renderLines(text)}  
    </p>
  )
}


// ── SUBTÍTULO (### Texto) ─────────────────────────────────────────
function BlockSubheading({ text, color }) {
  const cleanText = text.replace(/^###\s*/, '')
  return (
    <div style={{ margin: '32px 0 16px 0' }}>
      <h3 style={{ fontFamily: T.ff.display, fontSize: 22.5, fontWeight: 500, color: `${color}dd`, letterSpacing: '-0.02em', marginBottom: 20 }}>
        {cleanText}
      </h3>
      {/* Línea similar a la de título */}
      <div style={{ width: 500, height: 2, borderRadius: 1, background: `linear-gradient(to right,${color}50,transparent)`, marginBottom: 30 }} 
      />
    </div>
  )
}


// ── FIRMA (Alus Anahori) ──────────────────────────────────────────
function BlockSignature({ color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '40px 0 32px' }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right,transparent,${color}30)` }} />
      <span style={{ fontFamily: T.ff.mono, fontSize: 15, color: `${color}80`, letterSpacing: '.25em', textTransform: 'uppercase' }}>Alus Anahori</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to left,transparent,${color}30)` }} />
    </div>
  )
}

// ── PENSAMIENTO DE ZURI (*texto*) ─────────────────────────────────
// Monólogo interno en el presente de la narración.
// Asteriscos al inicio y al fin — no aparecen en pantalla.
// Borde punteado izquierdo + símbolo ◈ + violeta claro.
function BlockThought({ text }) {
  // Elimina el * de inicio y de fin
  const clean = text.replace(/^\*\s*/, '').replace(/\s*\*$/, '')
  return (
    <div style={{
      position: 'relative',
      fontFamily: T.ff.body, fontSize: 15.5, fontStyle: 'italic',
      color: T.thought,
      background: 'rgba(200,184,255,0.04)',
      borderRadius: 8,
      padding: '16px 20px 16px 28px',
      margin: '20px 0', lineHeight: 1.95,
    }}>
      {/* Borde punteado izquierdo: lo punteado indica que es interno */}
      <div style={{
        position: 'absolute', left: 0, top: 8, bottom: 8, width: 2,
        background: `repeating-linear-gradient(to bottom,${T.thought}60 0px,${T.thought}60 4px,transparent 4px,transparent 10px)`,
      }} />
      {/* Símbolo identificador del bloque */}
      <div style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: `${T.thought}80`, lineHeight: 1 }}>◈</div>
      {renderLines(clean)}
    </div>
  )
}

// ── DIÁLOGO PRESENTE (:D texto) ───────────────────────────────────
// Palabras dichas en voz alta en el hilo narrativo presente.
// Raya em + texto. Color principal para máxima legibilidad.
function BlockDialogue({ text }) {
  const clean = text.replace(/^:D\s*/, '').trim()
  return (
    <div style={{
      fontFamily: T.ff.body, fontSize: 16,
      color: T.onSurface, lineHeight: 1.85,
      margin: '4px 0', paddingLeft: 20,
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <span style={{ color: 'rgba(232,228,227,0.3)', flexShrink: 0, fontWeight: 300, marginTop: 2, fontSize: 18 }}>—</span>
      <span>{renderLines(clean)}</span>
    </div>
  )
}

// ── DIÁLOGO EN ARCHIVO PIA (:P texto) ────────────────────────────
// Palabras dichas dentro de un recuerdo o grabación reproducida por el PIA.
// Más apagado que el diálogo presente: pertenece al pasado registrado.
function BlockDialoguePia({ text }) {
  const clean = text.replace(/^:P\s*/, '').trim()
  return (
    <div style={{
      fontFamily: T.ff.body, fontSize: 14.5,
      color: 'rgba(232,228,227,0.65)',
      lineHeight: 1.8, margin: '4px 0', paddingLeft: 28,
      display: 'flex', gap: 10, alignItems: 'flex-start',
      borderLeft: `1px solid ${T.pia}20`,
    }}>
      <span style={{ color: `${T.pia}50`, flexShrink: 0, fontWeight: 300, marginTop: 2, fontSize: 16 }}>—</span>
      <span>{renderLines(clean)}</span>
    </div>
  )
}

// ── INICIO DE ARCHIVO PIA (>PIA Título) ──────────────────────────
// Cabecera visual de interfaz tecnológica.
// Verde PIA, monospace, borde superior sólido, indicador pulsante.
function BlockPiaStart({ text }) {
  const title = text.replace(/^>PIA\s*/i, '').trim()
  return (
    <div style={{
      fontFamily: T.ff.mono,
      margin: '36px 0 0 0',
      borderTop: `1px solid ${T.pia}50`,
      borderLeft: `2px solid ${T.pia}`,
      borderRadius: '0 8px 0 0',
      overflow: 'hidden',
    }}>
      <div style={{
        background: `linear-gradient(to right,${T.pia}15,transparent)`,
        padding: '10px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {/* Indicador de reproducción */}
        <span style={{ color: T.pia, fontSize: 10, letterSpacing: '.1em' }}>▶ PIA</span>
        <div style={{ width: 1, height: 12, background: `${T.pia}40` }} />
        {/* Título del archivo */}
        <span style={{ color: T.pia, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 500 }}>
          {title || 'Archivo sin título'}
        </span>
        {/* Punto pulsante: indica que está "reproduciendo" */}
        <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: T.pia, boxShadow: `0 0 8px ${T.pia}`, animation: 'h-glow-pulse 2s ease infinite' }} />
      </div>
    </div>
  )
}

// ── FIN DE ARCHIVO PIA (<PIA) ─────────────────────────────────────
// Cierra visualmente el bloque del archivo PIA.
function BlockPiaEnd() {
  return (
    <div style={{
      fontFamily: T.ff.mono,
      borderBottom: `1px solid ${T.pia}40`,
      borderLeft: `2px solid ${T.pia}40`,
      borderRadius: '0 0 8px 0',
      margin: '0 0 36px 0',
      padding: '8px 18px',
      background: `linear-gradient(to right,${T.pia}06,transparent)`,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ color: `${T.pia}60`, fontSize: 9, letterSpacing: '.12em' }}>■ FIN DEL ARCHIVO</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right,${T.pia}20,transparent)` }} />
    </div>
  )
}

// ── MULTIMEDIA (@img / @gif / @audio) ────────────────────────────
// Placeholder visual para media incrustada.
// Cuando Firebase Storage esté activo (Fase 3), este bloque
// puede evolucionar para mostrar la imagen/audio real.
function BlockMedia({ text, type }) {
  // Extrae la descripción quitando el marcador inicial
  const clean   = text.replace(/^@(img|gif|audio)\s*/i, '').trim()
  const icon    = type === 'media-audio' ? '♪' : type === 'media-gif' ? '◎' : '⬚'
  const label   = type === 'media-audio' ? 'Audio' : type === 'media-gif' ? 'GIF' : 'Imagen'
  return (
    <div style={{
      margin: '28px 0',
      border: `1px dashed ${T.media}40`,
      borderRadius: 8,
      padding: '20px 24px',
      background: 'rgba(255,184,108,0.03)',
      display: 'flex', alignItems: 'flex-start', gap: 16,
    }}>
      <div style={{ fontSize: 24, color: T.media, opacity: 0.7, flexShrink: 0, lineHeight: 1, marginTop: 2 }}>{icon}</div>
      <div>
        <div style={{ fontFamily: T.ff.mono, fontSize: 9, color: T.media, letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
        <div style={{ fontFamily: T.ff.body, fontSize: 13, color: 'rgba(232,228,227,0.5)', fontStyle: 'italic', lineHeight: 1.6 }}>{clean}</div>
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════
//  RENDERIZADOR DE SECCIÓN
//  Divide el texto de la sección por \n\n y renderiza cada bloque.
// ══════════════════════════════════════════════════════════════════

function renderSection(sectionContent, color) {
  // El preprocesador ya garantizó que cada bloque especial
  // está rodeado de líneas vacías, así que split('\n\n') es suficiente.
  const blocks = sectionContent.split('\n\n').filter(b => b.trim())
  let pCount   = 0

  return blocks.map((block, i) => {
    const type = detectBlockType(block)
    switch (type) {
      case 'separator':    return <BlockSeparator  key={i} color={color} />
      case 'log':          return <BlockLog         key={i} text={block} color={color} />
      case 'quote':        return <BlockQuote       key={i} text={block} color={color} />
      case 'data':         return <BlockData        key={i} text={block} />
      case 'subheading':   return <BlockSubheading  key={i} text={block} color={color} />
      case 'signature':    return <BlockSignature   key={i} color={color} />
      case 'thought':      return <BlockThought     key={i} text={block} />
      case 'dialogue':     return <BlockDialogue    key={i} text={block} />
      case 'dialogue-pia': return <BlockDialoguePia key={i} text={block} />
      case 'pia-start':    return <BlockPiaStart    key={i} text={block} />
      case 'pia-end':      return <BlockPiaEnd      key={i} />
      case 'media-img':
      case 'media-gif':
      case 'media-audio':  return <BlockMedia       key={i} text={block} type={type} />
      default: {
        const isFirst = pCount++ === 0
        return <BlockParagraph key={i} text={block} isFirst={isFirst} />
      }
    }
  })
}


// ══════════════════════════════════════════════════════════════════
//  BARRA DE PROGRESO
// ══════════════════════════════════════════════════════════════════

function ProgressBar({ current, total, color }) {
  if (total <= 1) return null
  const pct = ((current + 1) / total) * 100
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 400, background: 'rgba(255,255,255,0.04)' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(to right,${color}60,${color})`, boxShadow: `0 0 12px ${color}`, transition: 'width .45s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════
//  NAVEGACIÓN ENTRE PÁGINAS
// ══════════════════════════════════════════════════════════════════

function NavButton({ onClick, disabled, color, label, primary }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: T.ff.mono, fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase',
        color:      disabled ? T.outline : (primary && hov) ? T.bg : color,
        background: disabled ? 'transparent' : primary && hov ? color : hov ? `${color}12` : primary ? `${color}10` : 'transparent',
        border:     `1px solid ${disabled ? T.outline + '40' : hov ? color : color + '30'}`,
        borderRadius: 25, padding: '9px 22px',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.25 : 1,
        transition: 'all .22s ease',
        boxShadow: primary && hov ? `0 0 20px ${color}40` : 'none',
        whiteSpace: 'nowrap',
      }}>
      {label}
    </button>
  )
}

function PageNav({ current, total, sections, color, onPrev, onNext, onJump }) {
  if (total <= 1) return null
  return (
    <>
      {/* ── BOTÓN ANTERIOR ───────────────────────────────────────────────
          Posicionado fijo en el centro vertical del lado izquierdo.
          No interfiere con el scroll del contenido porque es fixed.
          Se oculta con opacity cuando está en la primera página.      */}
      <div style={{
        position: 'fixed',
        left: 20,                        // Pegado al borde izquierdo con margen mínimo
        top: '50%',                      // Centro vertical de la pantalla
        transform: 'translateY(-50%)',   // Ajuste exacto al centro (compensa la altura propia)
        zIndex: 350,
      }}>
        <NavButton onClick={onPrev} disabled={current === 0} color={color} label="← ANTERIOR" />
      </div>

      {/* ── BOTÓN SIGUIENTE ──────────────────────────────────────────────
          Posicionado fijo en el centro vertical del lado derecho.
          primary=true activa el estilo destacado (fondo de color).   */}
      <div style={{
        position: 'fixed',
        right: 20,                       // Pegado al borde derecho con margen mínimo
        top: '50%',                      // Centro vertical de la pantalla
        transform: 'translateY(-50%)',   // Ajuste exacto al centro
        zIndex: 350,
      }}>
        <NavButton onClick={onNext} disabled={current === total - 1} color={color} label="SIGUIENTE →" primary />
      </div>

      {/* ── INDICADORES DE CAPÍTULO (PUNTOS) ────────────────────────────
          Barra fija en la parte inferior, centrada horizontalmente.
          Los puntos son más grandes y visibles que antes:
          - Inactivos: círculo sólido 8×8 px con mayor opacidad (55%)
          - Activo:    barra ancha 32×8 px con glow y brillo completo
          Se eliminó el gradiente oscuro de fondo para no bloquear texto. */}
      <div style={{
        position: 'fixed',
        bottom: 20,                      // Separado del borde inferior
        left: 0,
        right: 0,
        zIndex: 350,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,                          // Espacio entre puntos (antes 6)
        flexWrap: 'wrap',
        padding: '20px 80px 20px',       // Arriba / lados (evita solapar botones) / abajo
        background: 'linear-gradient(to top, rgba(5,5,5,1) 60%, rgba(5,5,5,0.85))', // Fondo opaco que se funde hacia arriba
        pointerEvents: 'none',           // El contenedor no captura clics, solo los botones internos
      }}>
        {sections.map((s, i) => {
          const active = i === current
          return (
            <button
              key={i}
              onClick={() => onJump(i)}
              title={s.title || `Capítulo ${i + 1}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 4px',      // Área táctil generosa
                pointerEvents: 'auto',   // Reactiva clics solo en cada botón
              }}
            >
              {/* Indicador gráfico: barra larga si activo, punto redondo si no */}
              <div style={{
                width:        active ? 32 : 8,   // Activo: más ancho para destacar
                height:       8,                  // Altura aumentada (antes 3) para más visibilidad
                borderRadius: active ? 4 : '50%', // Cápsula si activo, círculo si inactivo
                background:   active ? color : `${color}55`, // Inactivo más visible (antes 28%)
                boxShadow:    active ? `0 0 12px ${color}, 0 0 24px ${color}60` : `0 0 4px ${color}30`,
              }} />

              {/* Etiqueta de título: solo aparece bajo el punto activo */}
              {s.title && active && (
                <div style={{
                  fontFamily:    T.ff.mono,
                  fontSize:      8.5,
                  color,
                  letterSpacing: '.09em',
                  textTransform: 'uppercase',
                  maxWidth:      90,
                  overflow:      'hidden',
                  textOverflow:  'ellipsis',
                  whiteSpace:    'nowrap',
                }}>
                  {s.title}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}


function CloseButton({ onClick, color, label }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: T.ff.mono, fontSize: 9.5,
        color: hov ? color : T.onVariant,
        background: 'transparent',
        border: `1px solid ${hov ? color + '60' : T.outline}`,
        borderRadius: 6, padding: '7px 18px',
        cursor: 'pointer', letterSpacing: '.14em', textTransform: 'uppercase',
        marginBottom: 44, display: 'flex', alignItems: 'center', gap: 8,
        transition: 'all .2s ease',
      }}>
      {label}
    </button>
  )
}



// ══════════════════════════════════════════════════════════════════
//  READER PRINCIPAL
// ══════════════════════════════════════════════════════════════════

export default function Reader({ entry, color, onClose }) {
  const sections              = splitIntoSections(entry.content)
  const total                 = sections.length
  const [page, setPage]       = useState(0)
  const scrollRef             = useRef(null)
  const [entering, setEntering] = useState(true)

  useEffect(() => { const t = setTimeout(() => setEntering(false), 400); return () => clearTimeout(t) }, [])

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }, [page])

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape')     onClose()
      if (e.key === 'ArrowRight') setPage(p => Math.min(p + 1, total - 1))
      if (e.key === 'ArrowLeft')  setPage(p => Math.max(p - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, total])

  const goNext = useCallback(() => setPage(p => Math.min(p + 1, total - 1)), [total])
  const goPrev = useCallback(() => setPage(p => Math.max(p - 1, 0)), [])
  const goTo   = useCallback(i => setPage(i), [])
  const cur    = sections[page]

  return (
    <>
      <ProgressBar current={page} total={total} color={color} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', animation: entering ? 'h-fadein .35s ease' : 'none' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,4,10,0.96)', backdropFilter: 'blur(28px)' }} />
        
        {/* Barra de acento lateral izquierda — color del cuadrante */}
        <div ref={scrollRef} className="h101-scroll"
          style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: `clamp(28px,5vh,56px) clamp(24px,9vw,130px) ${total > 1 ? '130px' : '80px'}`, animation: 'h-slideup .4s ease' }}>

          {/* ── Página 0: cabecera completa ── */}
          {page === 0 && (
            <>
              <CloseButton onClick={onClose} color={color} label="← VOLVER AL UNIVERSO" />
              <div style={{ maxWidth: 820, margin: '0 auto 52px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 16, fontFamily: T.ff.mono, fontSize: 10, color, letterSpacing: '.2em', textTransform: 'uppercase' }}>
                  <div style={{ width: 20, height: 1, background: `linear-gradient(to right,${color},transparent)` }} />
                  {entry.era}
                  <span style={{ color: T.outline }}>·</span>
                  {entry.type}
                  {total > 1 && (<><span style={{ color: T.outline }}>·</span><span style={{ color: T.onVariant }}>{total} SECCIONES</span></>)}
                </div>
                <h1 style={{ fontFamily: T.ff.display, fontSize: 'clamp(2rem,4vw,5rem)', fontWeight: 800, color: '#fff', lineHeight: .98, marginBottom: 16, letterSpacing: '-.02em', textShadow: `0 0 80px ${color}35` }}>
                  {entry.title}
                </h1>
                {entry.subtitle && (
                  <p style={{ fontFamily: T.ff.body, fontSize: 16, fontStyle: 'italic', color: T.onVariant, marginBottom: 28, lineHeight: 1.6 }}>{entry.subtitle}</p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 36, justifyContent: 'center' }}>
                  {entry.tags?.map(tag => (
                    <span key={tag} style={{ fontFamily: T.ff.mono, fontSize: 10, color, border: `1px solid ${color}30`, padding: '4px 6px', borderRadius: 999, letterSpacing: '.09em', textTransform: 'uppercase', background: `${color}08` }}>{tag}</span>
                  ))}
                </div>
                <div style={{ height: 1, marginBottom: 52, background: `linear-gradient(to right,${color}80,${color}20,transparent)` }} />
              </div>
            </>
          )}

          {/* ── Páginas > 0: cabecera compacta ── */}
          {page > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 44, maxWidth: 820, margin: '0 auto 44px' }}>
              <button onClick={onClose} style={{ fontFamily: T.ff.mono, fontSize: 11, color: T.onVariant, background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color .2s', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = color}
                onMouseLeave={e => e.currentTarget.style.color = T.onVariant}>VOLVER AL UNIVERSO</button>
            </div>
          )}

          {/* ── Título de la sección actual ── */}
          {cur.title && (
            <div style={{ maxWidth: 900, margin: '0 auto 36px', animation: 'h-slideup .35s ease both' }}>
              <div style={{ fontFamily: T.ff.mono, fontSize: 9, color: `${color}60`, letterSpacing: '.22em', textTransform: 'uppercase', marginBottom: 10 }}>
                {total > 1 ? `${page + 1} / ${total}` : ''}
              </div>
              <h2 style={{ fontFamily: T.ff.display, fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', fontWeight: 700, color, lineHeight: 1.15, marginBottom: 22, textShadow: `0 0 40px ${color}30`, letterSpacing: '-.01em' }}>
                {cur.title}
              </h2>
              <div style={{ width: 36, height: 2, borderRadius: 1, background: `linear-gradient(to right,${color}80,transparent)`, marginBottom: 36 }} />
            </div>
          )}

          {/* ── Contenido de la sección ── */}
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            {renderSection(cur.content, color)}
          </div>

          {total > 1 && <div style={{ height: 100 }} />}
        </div>
      </div>
      <PageNav current={page} total={total} sections={sections} color={color} onPrev={goPrev} onNext={goNext} onJump={goTo} />
    </>
  )
}
