// ════════════════════════════════════════════════════════════════════
//  App.jsx — Punto de entrada de la aplicación Humanidad 101
//
//  Maneja la navegación entre dos pantallas:
//    - Landing  → presentación del proyecto, redes y autor
//    - Timeline → línea de tiempo interactiva del universo
//
//  No usa React Router: la transición se maneja con un estado
//  booleano simple (started). Esto evita dependencias extra y
//  permite animaciones de entrada/salida controladas.
// ════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import Landing  from './Landing'    // Pantalla de bienvenida
import Timeline from './Timeline'   // Línea de tiempo del universo

export default function App() {
  // started: false → muestra Landing | true → muestra Timeline
  // Se activa cuando el usuario hace clic en "Entrar al universo"
  const [started, setStarted] = useState(false)

  return started
    ? <Timeline onExit={() => setStarted(false)} />  // La función para volver al Landing
    : <Landing onEnter={() => setStarted(true)} />   // Puerta de entrada
}
